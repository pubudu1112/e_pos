"use client";

import React, { useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export type PaginationProps = {
  currentPage?: number;
  totalPages?: number;
  totalRecords?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  startIndex?: number;
  endIndex?: number;
  recordLabel?: string;
  className?: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    pageSize: number;
    handlePageChange: (page: number) => void;
    handlePageSizeChange?: (pageSize: number) => void;
    startIndex?: number;
    endIndex?: number;
  };
};

export default function Pagination({
  currentPage: propCurrentPage,
  totalPages: propTotalPages,
  totalRecords: propTotalRecords,
  pageSize: propPageSize,
  onPageChange: propOnPageChange,
  onPageSizeChange: propOnPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  startIndex: propStartIndex,
  endIndex: propEndIndex,
  recordLabel = "records",
  className = "",
  pagination,
}: PaginationProps) {
  const currentPage = pagination ? pagination.currentPage : (propCurrentPage ?? 1);
  const totalPages = pagination ? pagination.totalPages : (propTotalPages ?? 1);
  const totalRecords = pagination ? pagination.totalRecords : (propTotalRecords ?? 0);
  const pageSize = pagination ? pagination.pageSize : (propPageSize ?? 25);
  const onPageChange = pagination ? pagination.handlePageChange : (propOnPageChange ?? (() => {}));
  const onPageSizeChange = pagination ? pagination.handlePageSizeChange : propOnPageSizeChange;
  const startIndex = pagination?.startIndex ?? propStartIndex;
  const endIndex = pagination?.endIndex ?? propEndIndex;

  const safeCurrentPage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));

  const startRecord =
    startIndex !== undefined
      ? startIndex + 1
      : totalRecords === 0
        ? 0
        : (safeCurrentPage - 1) * pageSize + 1;

  const endRecord =
    endIndex !== undefined
      ? endIndex
      : Math.min(safeCurrentPage * pageSize, totalRecords);

  const pageNumbers = useMemo(() => {
    const maxVisiblePages = 5;
    let start = Math.max(1, safeCurrentPage - Math.floor(maxVisiblePages / 2));
    const end = Math.min(totalPages, start + maxVisiblePages - 1);
    start = Math.max(1, end - maxVisiblePages + 1);

    return Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i);
  }, [safeCurrentPage, totalPages]);

  if (totalRecords === 0 && totalPages <= 1) {
    return null;
  }

  return (
    <div
      className={`flex flex-col gap-4 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      {/* Records info + Page size */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="text-xs text-slate-500">
          Showing{" "}
          <span className="font-bold text-slate-800">
            {totalRecords === 0 ? 0 : startRecord}
          </span>
          {" - "}
          <span className="font-bold text-slate-800">{endRecord}</span>
          {" of "}
          <span className="font-bold text-slate-800">{totalRecords}</span>
          {` ${recordLabel}`}
        </p>

        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <label
              htmlFor="pagination-page-size"
              className="whitespace-nowrap text-xs text-slate-500"
            >
              Per page:
            </label>
            <select
              id="pagination-page-size"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Page Navigation Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-1">
        {/* First page button */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={safeCurrentPage === 1 || totalRecords === 0}
          title="First page"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>

        {/* Previous page button */}
        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage === 1 || totalRecords === 0}
          title="Previous page"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* First Page Shortcut */}
        {pageNumbers.length > 0 && pageNumbers[0] > 1 && (
          <>
            <button
              type="button"
              onClick={() => onPageChange(1)}
              className="flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
            >
              1
            </button>
            {pageNumbers[0] > 2 && (
              <span className="px-1 text-xs text-slate-400">...</span>
            )}
          </>
        )}

        {/* Page Numbers */}
        {pageNumbers.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            aria-current={safeCurrentPage === page ? "page" : undefined}
            className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold transition ${
              safeCurrentPage === page
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {page}
          </button>
        ))}

        {/* Last Page Shortcut */}
        {pageNumbers.length > 0 &&
          pageNumbers[pageNumbers.length - 1] < totalPages && (
            <>
              {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                <span className="px-1 text-xs text-slate-400">...</span>
              )}
              <button
                type="button"
                onClick={() => onPageChange(totalPages)}
                className="flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
              >
                {totalPages}
              </button>
            </>
          )}

        {/* Next page button */}
        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage >= totalPages || totalRecords === 0}
          title="Next page"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Last page button */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={safeCurrentPage >= totalPages || totalRecords === 0}
          title="Last page"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Reusable client-side pagination hook
 */
export function usePagination<T>(items: T[], defaultPageSize: number = 25) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(defaultPageSize);

  const totalRecords = items.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);

  const paginatedItems = useMemo(() => {
    return items.slice(startIndex, startIndex + pageSize);
  }, [items, startIndex, pageSize]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // Keep page within valid range if items length shrinks
  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return {
    currentPage: safeCurrentPage,
    pageSize,
    totalRecords,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems,
    setCurrentPage,
    setPageSize,
    handlePageChange,
    handlePageSizeChange,
  };
}
