import mongoose from 'mongoose';
import { Service } from '../../schemas/mongoose/service.model';
import { Category } from '../../schemas/mongoose/category.model';
import { ApiError } from '../../utils/ApiError';
import { getPaginationOptions, buildPaginationMeta } from '../../utils/paginate';
import type {
  CreateServiceInput,
  UpdateServiceInput,
  GetServicesQuery,
  CreateCategoryInput,
} from '../../schemas/zod/service.schema';
import { getCommissionRate } from '../../config/platformconfig';

// ─── Categories ───────────────────────────────────────────────────────────────

export const createCategory = async (data: CreateCategoryInput) => {
  const existing = await Category.findOne({ slug: data.slug });
  if (existing) throw ApiError.conflict('A category with this slug already exists');

  const category = await Category.create(data);
  return category;
};

export const getCategories = async (platform?: string) => {
  const filter: Record<string, unknown> = { isActive: true };
  if (platform) filter.platform = platform;

  return Category.find(filter).sort({ platform: 1, name: 1 });
};

// ─── Create Service ───────────────────────────────────────────────────────────

export const createService = async (sellerId: string, data: CreateServiceInput) => {
  // Validate category exists and is active
  const category = await Category.findOne({ _id: data.categoryId, isActive: true });
  if (!category) throw ApiError.notFound('Category not found or is inactive');

  const service = await Service.create({
    ...data,
    sellerId: new mongoose.Types.ObjectId(sellerId),
    categoryId: new mongoose.Types.ObjectId(data.categoryId),
  });

  return service.populate('categoryId', 'name platform slug');
};

// ─── Get Services (Marketplace Browse) ───────────────────────────────────────

export const getServices = async (query: GetServicesQuery) => {
  const { page, limit, category, platform, search, minPrice, maxPrice, sort, order, featured } =
    query;

  const filter: Record<string, unknown> = { isActive: true };

  if (category) filter.categoryId = new mongoose.Types.ObjectId(category);

  if (platform) {
    // Find all category IDs for this platform then filter services by them
    const categories = await Category.find({ platform, isActive: true }).select('_id');
    filter.categoryId = { $in: categories.map((c) => c._id) };
  }

  if (featured) filter.isFeatured = true;

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.pricePerUnit = {};
    if (minPrice !== undefined) (filter.pricePerUnit as any).$gte = minPrice;
    if (maxPrice !== undefined) (filter.pricePerUnit as any).$lte = maxPrice;
  }

  // Full-text search if query provided, otherwise use filter only
  let queryBuilder;
  if (search) {
    queryBuilder = Service.find({ ...filter, $text: { $search: search } });
  } else {
    queryBuilder = Service.find(filter);
  }

  const sortOrder = order === 'asc' ? 1 : -1;
  const { skip } = getPaginationOptions(page, limit);

  const [services, total] = await Promise.all([
    queryBuilder
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(limit)
      .populate('sellerId', 'firstName lastName sellerProfile.level sellerProfile.badge')
      .populate('categoryId', 'name platform slug'),
    Service.countDocuments(search ? { ...filter, $text: { $search: search } } : filter),
  ]);

  return { services, pagination: buildPaginationMeta(total, page, limit) };
};

// ─── Get Single Service ───────────────────────────────────────────────────────

export const getServiceById = async (serviceId: string) => {
  const service = await Service.findOne({ _id: serviceId, isActive: true })
    .populate('sellerId', 'firstName lastName sellerProfile')
    .populate('categoryId', 'name platform slug');

  if (!service) throw ApiError.notFound('Service not found');
  return service;
};

// ─── Get My Services (Seller) ─────────────────────────────────────────────────

export const getMyServices = async (sellerId: string, page: number, limit: number) => {
  const { skip } = getPaginationOptions(page, limit);

  const [services, total] = await Promise.all([
    Service.find({ sellerId: new mongoose.Types.ObjectId(sellerId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('categoryId', 'name platform slug'),
    Service.countDocuments({ sellerId: new mongoose.Types.ObjectId(sellerId) }),
  ]);

  return { services, pagination: buildPaginationMeta(total, page, limit) };
};

// ─── Update Service ───────────────────────────────────────────────────────────

export const updateService = async (
  serviceId: string,
  sellerId: string,
  data: UpdateServiceInput
) => {
  const service = await Service.findOne({ _id: serviceId, sellerId });
  if (!service) throw ApiError.notFound('Service not found or you do not own this service');

  Object.assign(service, data);
  await service.save();

  return service.populate('categoryId', 'name platform slug');
};

// ─── Delete Service ───────────────────────────────────────────────────────────

export const deleteService = async (serviceId: string, sellerId: string) => {
  const service = await Service.findOne({ _id: serviceId, sellerId });
  if (!service) throw ApiError.notFound('Service not found or you do not own this service');

  // Soft delete — just deactivate, don't remove from DB
  // so existing orders that reference it still resolve
  service.isActive = false;
  await service.save();
};

// ─── Update Category ──────────────────────────────────────────────────────────

export const updateCategory = async (categoryId: string, data: Partial<CreateCategoryInput>) => {
  const category = await Category.findById(categoryId);
  if (!category) throw ApiError.notFound('Category not found');

  if (data.slug && data.slug !== category.slug) {
    const slugExists = await Category.findOne({ slug: data.slug, _id: { $ne: categoryId } });
    if (slugExists) throw ApiError.conflict('A category with this slug already exists');
  }

  Object.assign(category, data);
  await category.save();
  return category;
};

// ─── Delete Category ──────────────────────────────────────────────────────────

export const deleteCategory = async (categoryId: string) => {
  const category = await Category.findById(categoryId);
  if (!category) throw ApiError.notFound('Category not found');

  // Soft delete — deactivate so existing services still resolve
  category.isActive = false;
  await category.save();
};

export const getPricePreview = async (serviceId: string, quantity: number) => {
  const service = await Service.findOne({ _id: serviceId, isActive: true })
    .populate('sellerId', 'firstName lastName sellerProfile')
    .populate('categoryId', 'name');

  if (!service) throw ApiError.notFound('Service not found or is no longer available');

  if (quantity < service.minQty || quantity > service.maxQty) {
    throw ApiError.badRequest(`Quantity must be between ${service.minQty} and ${service.maxQty}`);
  }

  const [COMMISSION_RATE] = await Promise.all([getCommissionRate()]);

  const totalAmount = service.pricePerUnit * quantity;
  const platformFee = Math.round(totalAmount * COMMISSION_RATE);
  const sellerEarnings = totalAmount - platformFee;

  return {
    serviceId: service._id,
    serviceTitle: service.title,
    seller: {
      _id: (service.sellerId as any)._id,
      firstName: (service.sellerId as any).firstName,
      lastName: (service.sellerId as any).lastName,
      level: (service.sellerId as any).sellerProfile?.level,
    },
    category: (service.categoryId as any).name,
    quantity,
    unitPrice: service.pricePerUnit,
    totalAmount,
    platformFee,
    sellerEarnings,
    deliveryHours: service.deliveryHours,
    requiresCredentials: service.requiresCredentials,
    refillPolicy: service.refillPolicy,
    note: 'All amounts in kobo (divide by 100 for NGN)',
  };
};
