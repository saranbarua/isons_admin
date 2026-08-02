import { API_BASE_URL } from "../config/api";
import { useAuthStore } from "../store/auth";

export type UserRole = "ADMIN" | "MODERATOR";

// Product Reviews
export type RatingStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface LoginResponse {
  token: string;
  username: string;
  role: UserRole;
}

export async function loginApi(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = (data && data.error) || `Login failed (${res.status})`;
    throw new Error(message);
  }

  return data as LoginResponse;
}

// Audit Logs
export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  changes: string;
  performedById: string | null;
  createdAt: string; // ISO
}

export interface AuditLogQuery {
  action?: string;
  entity?: string;
  performedById?: string;
  limit?: number;
  offset?: number;
}

function toQuery(params: unknown) {
  const usp = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    usp.append(k, String(v));
  });
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split(".")[1];
    const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function handleAuthFailure() {
  useAuthStore.getState().logout();
  window.location.href = "/login";
}

async function authFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const token = useAuthStore.getState().token;
  if (token) {
    const payload = parseJwtPayload(token);
    if (payload && typeof payload.exp === "number") {
      if (Date.now() >= payload.exp * 1000) {
        handleAuthFailure();
        throw new Error("Session expired");
      }
    }
  }

  const res = await fetch(url, init);

  if (res.status === 401) {
    handleAuthFailure();
    throw new Error("Session expired");
  }

  return res;
}

export async function listAuditLogs(
  query: AuditLogQuery,
  role: UserRole,
): Promise<AuditLogEntry[]> {
  const token = useAuthStore.getState().token;
  const res = await authFetch(`${API_BASE_URL}/audit-logs${toQuery(query)}`, {
    headers: {
      "x-user-role": role,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && data.error) || `Failed to fetch (${res.status})`;
    throw new Error(message);
  }
  return data as AuditLogEntry[];
}

export async function getAuditLogById(
  id: string,
  role: UserRole,
): Promise<AuditLogEntry> {
  const token = useAuthStore.getState().token;
  const res = await authFetch(`${API_BASE_URL}/audit-logs/${id}`, {
    headers: {
      "x-user-role": role,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && data.error) || `Failed to fetch (${res.status})`;
    throw new Error(message);
  }
  return data as AuditLogEntry;
}

// Categories
export type CategoryStatus = "ACTIVE" | "INACTIVE";
export interface CategoryBase {
  id: string;
  name: string;
  slug: string;
  status: CategoryStatus;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  productCount: number;
}

export interface CategoryDetail extends CategoryBase {
  parent: CategoryBase | null;
  children: CategoryBase[];
}

export interface CategoryCreateInput {
  name: string;
  slug?: string;
  parentId?: string | null;
}

export interface CategoryUpdateInput {
  name?: string;
  slug?: string;
  parentId?: string | null;
  status?: CategoryStatus;
}

export interface CategoryListQuery {
  parentId?: string | null;
  status?: CategoryStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = useAuthStore.getState().token;
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra || {}),
  } as HeadersInit;
}

export async function createCategory(
  body: CategoryCreateInput,
): Promise<CategoryBase> {
  const res = await authFetch(`${API_BASE_URL}/categories`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && data.error) || `Failed to create (${res.status})`;
    throw new Error(message);
  }
  return data as CategoryBase;
}

export async function listCategories(
  query: CategoryListQuery = {},
): Promise<CategoryBase[]> {
  const usp = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v === undefined) return;
    if (k === "parentId" && v === null) {
      usp.append("parentId", "null");
    } else {
      usp.append(k, String(v));
    }
  });
  const qs = usp.toString();
  const res = await authFetch(`${API_BASE_URL}/categories${qs ? `?${qs}` : ""}`, {
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && data.error) || `Failed to fetch (${res.status})`;
    throw new Error(message);
  }
  return data as CategoryBase[];
}

export async function getCategoryById(id: string): Promise<CategoryDetail> {
  const res = await authFetch(`${API_BASE_URL}/categories/${id}`, {
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && data.error) || `Failed to fetch (${res.status})`;
    throw new Error(message);
  }
  return data as CategoryDetail;
}

export async function updateCategory(
  id: string,
  body: CategoryUpdateInput,
): Promise<CategoryDetail> {
  const res = await authFetch(`${API_BASE_URL}/categories/${id}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && data.error) || `Failed to update (${res.status})`;
    throw new Error(message);
  }
  return data as CategoryDetail;
}

export async function deleteCategory(id: string): Promise<void> {
  const res = await authFetch(`${API_BASE_URL}/categories/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    let message = `Failed to delete (${res.status})`;
    try {
      const data = await res.json();
      if (data && data.error) message = data.error;
    } catch {}
    throw new Error(message);
  }
}

export interface ProductReview {
  id: string;
  rating: number; // 1..5
  comment: string | null;
  clientName?: string | null;
  status: RatingStatus;
  productId: string;
  createdAt: string;
}

export interface CreateReviewInput {
  rating: number;
  comment?: string | null;
  clientName?: string | null;
}

export interface UpdateReviewInput {
  rating?: number;
  comment?: string | null;
  clientName?: string | null;
}

export interface UpdateReviewStatusInput {
  status: RatingStatus;
}

export async function listProductReviews(
  productId: string,
  status?: RatingStatus,
): Promise<ProductReview[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await authFetch(
    `${API_BASE_URL}/products/${productId}/reviews${qs}`,
    {
      headers: authHeaders(),
    },
  );
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && data.error) || `Failed to fetch (${res.status})`;
    throw new Error(message);
  }
  return data as ProductReview[];
}

export async function createProductReview(
  productId: string,
  body: CreateReviewInput,
): Promise<ProductReview> {
  const res = await authFetch(`${API_BASE_URL}/products/${productId}/reviews`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && data.error) || `Failed to create (${res.status})`;
    throw new Error(message);
  }
  return data as ProductReview;
}

export async function updateProductReview(
  productId: string,
  reviewId: string,
  body: UpdateReviewInput,
): Promise<ProductReview> {
  const res = await authFetch(
    `${API_BASE_URL}/products/${productId}/reviews/${reviewId}`,
    {
      method: "PUT",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    },
  );
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && data.error) || `Failed to update (${res.status})`;
    throw new Error(message);
  }
  return data as ProductReview;
}

export async function patchProductReviewStatus(
  productId: string,
  reviewId: string,
  body: UpdateReviewStatusInput,
): Promise<ProductReview> {
  const res = await authFetch(
    `${API_BASE_URL}/products/${productId}/reviews/${reviewId}/status`,
    {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    },
  );
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (data && data.error) || `Failed to update status (${res.status})`;
    throw new Error(message);
  }
  return data as ProductReview;
}

export async function deleteProductReview(
  productId: string,
  reviewId: string,
): Promise<void> {
  const res = await authFetch(
    `${API_BASE_URL}/products/${productId}/reviews/${reviewId}`,
    {
      method: "DELETE",
      headers: authHeaders(),
    },
  );
  if (!res.ok) {
    let message = `Failed to delete (${res.status})`;
    try {
      const data = await res.json();
      if (data && data.error) message = data.error;
    } catch {}
    throw new Error(message);
  }
}

// Products
export type ProductStatus = "ACTIVE" | "INACTIVE";

export interface ProductImage {
  id: string;
  url: string;
  productId: string;
  createdAt: string; // ISO
}

export interface ProductCategoryRef {
  id: string;
  name: string;
  slug: string;
}

export interface ProductBase {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  description: string;
  modelNumber: string | null;
  status: ProductStatus;
  categoryId: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  deletedAt: string | null;
}

export interface ProductListItem extends ProductBase {
  category: ProductCategoryRef;
  images: ProductImage[];
}

export type ProductDetail = ProductListItem;

export interface ProductListQuery {
  categoryId?: string;
  status?: ProductStatus;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number; // 1..200, default 50
  offset?: number; // default 0
  sortBy?: "price" | "stock" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export async function listProducts(
  query: ProductListQuery = {},
): Promise<ProductListResponse> {
  const res = await authFetch(`${API_BASE_URL}/products${toQuery(query)}`, {
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && data.error) || `Failed to fetch (${res.status})`;
    throw new Error(message);
  }
  return data as ProductListResponse;
}

export async function getProductById(id: string): Promise<ProductDetail> {
  const res = await authFetch(`${API_BASE_URL}/products/${id}`, {
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && data.error) || `Failed to fetch (${res.status})`;
    throw new Error(message);
  }
  return data as ProductDetail;
}

export interface ProductListResponse {
  items: ProductListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface ProductCreateInput {
  name: string;
  slug?: string;
  price?: number; // >= 0
  stock?: number; // integer >= 0
  description?: string; // markup (e.g., Markdown)
  modelNumber?: string;
  categoryId: string;
  status?: ProductStatus; // defaults ACTIVE
}

export async function createProduct(
  body: ProductCreateInput,
): Promise<ProductDetail> {
  const res = await authFetch(`${API_BASE_URL}/products`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && data.error) || `Failed to create (${res.status})`;
    throw new Error(message);
  }
  return data as ProductDetail;
}

export interface ProductUpdateInput {
  name?: string;
  slug?: string;
  price?: number; // >= 0
  stock?: number; // integer >= 0
  description?: string;
  modelNumber?: string | null;
  categoryId?: string;
  status?: ProductStatus;
}

export async function updateProduct(
  id: string,
  body: ProductUpdateInput,
): Promise<ProductDetail> {
  const res = await authFetch(`${API_BASE_URL}/products/${id}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && data.error) || `Failed to update (${res.status})`;
    throw new Error(message);
  }
  return data as ProductDetail;
}

// Product Images
export async function uploadProductImages(
  productId: string,
  files: File[],
): Promise<ProductDetail> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("images", file);
  });

  const token = useAuthStore.getState().token;
  const res = await authFetch(`${API_BASE_URL}/products/${productId}/images`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (data && data.error) || `Failed to upload images (${res.status})`;
    throw new Error(message);
  }
  return data as ProductDetail;
}

export async function deleteProductImage(
  productId: string,
  imageId: string,
): Promise<ProductDetail> {
  const token = useAuthStore.getState().token;
  const res = await authFetch(
    `${API_BASE_URL}/products/${productId}/images/${imageId}`,
    {
      method: "DELETE",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (data && data.error) || `Failed to delete image (${res.status})`;
    throw new Error(message);
  }
  return data as ProductDetail;
}

// Product Terms
export interface ProductTerm {
  id: string;
  title: string;
  content: string;
  productId: string;
  createdAt: string; // ISO
}

export interface CreateTermInput {
  title: string;
  content: string;
}

export interface UpdateTermInput {
  title?: string;
  content?: string;
}

export async function listProductTerms(
  productId: string,
): Promise<ProductTerm[]> {
  const res = await authFetch(`${API_BASE_URL}/products/${productId}/terms`, {
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && data.error) || `Failed to fetch (${res.status})`;
    throw new Error(message);
  }
  return data as ProductTerm[];
}

export async function createProductTerm(
  productId: string,
  body: CreateTermInput,
): Promise<ProductTerm> {
  const res = await authFetch(`${API_BASE_URL}/products/${productId}/terms`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && data.error) || `Failed to create (${res.status})`;
    throw new Error(message);
  }
  return data as ProductTerm;
}

export async function updateProductTerm(
  productId: string,
  termId: string,
  body: UpdateTermInput,
): Promise<ProductTerm> {
  const res = await authFetch(
    `${API_BASE_URL}/products/${productId}/terms/${termId}`,
    {
      method: "PUT",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    },
  );
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && data.error) || `Failed to update (${res.status})`;
    throw new Error(message);
  }
  return data as ProductTerm;
}

export async function deleteProductTerm(
  productId: string,
  termId: string,
): Promise<void> {
  const res = await authFetch(
    `${API_BASE_URL}/products/${productId}/terms/${termId}`,
    {
      method: "DELETE",
      headers: authHeaders(),
    },
  );
  if (!res.ok) {
    let message = `Failed to delete (${res.status})`;
    try {
      const data = await res.json();
      if (data && data.error) message = data.error;
    } catch {}
    throw new Error(message);
  }
}

// Product Specs
export interface ProductSpec {
  id: string;
  key: string;
  value: string;
  productId: string;
  createdAt: string; // ISO
}

export interface CreateSpecInput {
  key: string;
  value: string;
}

export interface UpdateSpecInput {
  key?: string;
  value?: string;
}

export async function listProductSpecs(
  productId: string,
): Promise<ProductSpec[]> {
  const res = await authFetch(`${API_BASE_URL}/products/${productId}/specs`, {
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && data.error) || `Failed to fetch (${res.status})`;
    throw new Error(message);
  }
  return data as ProductSpec[];
}

export async function createProductSpec(
  productId: string,
  body: CreateSpecInput,
): Promise<ProductSpec> {
  const res = await authFetch(`${API_BASE_URL}/products/${productId}/specs`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && data.error) || `Failed to create (${res.status})`;
    throw new Error(message);
  }
  return data as ProductSpec;
}

export async function updateProductSpec(
  productId: string,
  specId: string,
  body: UpdateSpecInput,
): Promise<ProductSpec> {
  const res = await authFetch(
    `${API_BASE_URL}/products/${productId}/specs/${specId}`,
    {
      method: "PUT",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    },
  );
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && data.error) || `Failed to update (${res.status})`;
    throw new Error(message);
  }
  return data as ProductSpec;
}

export async function deleteProductSpec(
  productId: string,
  specId: string,
): Promise<void> {
  const res = await authFetch(
    `${API_BASE_URL}/products/${productId}/specs/${specId}`,
    {
      method: "DELETE",
      headers: authHeaders(),
    },
  );
  if (!res.ok) {
    let message = `Failed to delete (${res.status})`;
    try {
      const data = await res.json();
      if (data && data.error) message = data.error;
    } catch {}
    throw new Error(message);
  }
}

// Product Docs
export interface ProductDoc {
  id: string;
  title: string;
  fileUrl: string;
  productId: string;
  createdAt: string; // ISO
}

export interface UpdateDocInput {
  title: string;
}

export async function listProductDocs(
  productId: string,
): Promise<ProductDoc[]> {
  const res = await authFetch(`${API_BASE_URL}/products/${productId}/docs`, {
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && data.error) || `Failed to fetch (${res.status})`;
    throw new Error(message);
  }
  return data as ProductDoc[];
}

export async function uploadProductDoc(
  productId: string,
  title: string,
  file: File,
): Promise<ProductDoc> {
  const formData = new FormData();
  formData.append("title", title);
  formData.append("file", file);
  const token = useAuthStore.getState().token;
  const res = await authFetch(`${API_BASE_URL}/products/${productId}/docs`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && data.error) || `Failed to upload (${res.status})`;
    throw new Error(message);
  }
  return data as ProductDoc;
}

export async function updateProductDoc(
  productId: string,
  docId: string,
  body: UpdateDocInput,
): Promise<ProductDoc> {
  const res = await authFetch(
    `${API_BASE_URL}/products/${productId}/docs/${docId}`,
    {
      method: "PUT",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    },
  );
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && data.error) || `Failed to update (${res.status})`;
    throw new Error(message);
  }
  return data as ProductDoc;
}

export async function deleteProductDoc(
  productId: string,
  docId: string,
): Promise<void> {
  const res = await authFetch(
    `${API_BASE_URL}/products/${productId}/docs/${docId}`,
    {
      method: "DELETE",
      headers: authHeaders(),
    },
  );
  if (!res.ok) {
    let message = `Failed to delete (${res.status})`;
    try {
      const data = await res.json();
      if (data && data.error) message = data.error;
    } catch {}
    throw new Error(message);
  }
}

// Users
export type UserStatus = "ACTIVE" | "INACTIVE";

export interface UserItem {
  id: string;
  username: string;
  name: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface UserListQuery {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  limit?: number;
  offset?: number;
}

export interface UserListResponse {
  items: UserItem[];
  total: number;
}

export interface UserCreateInput {
  username: string;
  password: string;
  name?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface UserUpdateInput {
  username?: string;
  name?: string;
  role?: UserRole;
  status?: UserStatus;
}

export async function listUsers(
  query: UserListQuery = {},
): Promise<UserListResponse> {
  const res = await authFetch(`${API_BASE_URL}/users${toQuery(query)}`, {
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && data.error) || `Failed to fetch (${res.status})`;
    throw new Error(message);
  }
  return data as UserListResponse;
}

export async function getUserById(id: string): Promise<UserItem> {
  const res = await authFetch(`${API_BASE_URL}/users/${id}`, {
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && data.error) || `Failed to fetch (${res.status})`;
    throw new Error(message);
  }
  return data as UserItem;
}

export async function createUser(body: UserCreateInput): Promise<UserItem> {
  const res = await authFetch(`${API_BASE_URL}/users`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && data.error) || `Failed to create (${res.status})`;
    throw new Error(message);
  }
  return data as UserItem;
}

export async function updateUser(
  id: string,
  body: UserUpdateInput,
): Promise<UserItem> {
  const res = await authFetch(`${API_BASE_URL}/users/${id}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && data.error) || `Failed to update (${res.status})`;
    throw new Error(message);
  }
  return data as UserItem;
}

export async function setUserPassword(
  id: string,
  password: string,
): Promise<void> {
  const res = await authFetch(`${API_BASE_URL}/users/${id}/password`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    let message = `Failed to set password (${res.status})`;
    try {
      const data = await res.json();
      if (data && data.error) message = data.error;
    } catch {}
    throw new Error(message);
  }
}

export async function deleteUser(id: string): Promise<void> {
  const res = await authFetch(`${API_BASE_URL}/users/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    let message = `Failed to delete (${res.status})`;
    try {
      const data = await res.json();
      if (data && data.error) message = data.error;
    } catch {}
    throw new Error(message);
  }
}

// Dashboard

export interface DashboardData {
  summary: {
    totalUsers: number;
    totalCategories: number;
    totalProducts: number;
    totalReviews: number;
    totalContactMessages: number;
    totalAuditLogs: number;
  };
  users: {
    byRole: { role: string; count: number }[];
    byStatus: { status: string; count: number }[];
  };
  products: {
    byCategory: { category: string; count: number }[];
    stock: { total: number; average: number };
    price: { total: number; average: number; min: number; max: number };
  };
  reviews: {
    byStatus: { status: string; count: number }[];
  };
  contactMessages: {
    byStatus: { status: string; count: number }[];
  };
  recentActivity: {
    auditLogs: {
      id: string;
      action: string;
      entity: string;
      entityId: string;
      changes: string;
      createdAt: string;
      performedBy: { id: string; username: string; name: string | null };
    }[];
    reviews: {
      id: string;
      clientName: string;
      rating: number;
      status: string;
      createdAt: string;
      product: { id: string; name: string; slug: string };
    }[];
    contactMessages: {
      id: string;
      name: string;
      email: string;
      subject: string;
      status: string;
      createdAt: string;
    }[];
  };
}

export async function getDashboard(): Promise<DashboardData> {
  const res = await authFetch(`${API_BASE_URL}/dashboard`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    let message = `Failed to fetch dashboard (${res.status})`;
    try {
      const data = await res.json();
      if (data && data.error) message = data.error;
    } catch {}
    throw new Error(message);
  }
  return (await res.json()) as DashboardData;
}
