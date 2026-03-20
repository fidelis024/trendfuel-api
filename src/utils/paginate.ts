// utils/paginate.ts
export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginationResult<T> {
  data: T[];
  totalPages: number;
  currentPage: number;
  totalItems: number;
}

export const paginate = async <T>(
  query: any,
  options: PaginationOptions
): Promise<PaginationResult<T>> => {
  const { page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;

  const [data, totalItems] = await Promise.all([
    query.skip(skip).limit(limit),
    query.model.countDocuments(),
  ]);

  return {
    data,
    totalPages: Math.ceil(totalItems / limit),
    currentPage: page,
    totalItems,
  };
};

export default paginate;
