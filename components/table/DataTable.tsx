"use client";

import {
  getPaginationRowModel,
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getFilteredRowModel,
  ColumnFiltersState,
} from "@tanstack/react-table";
import Image from "next/image";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { decryptKey } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isAdmin?: boolean;
  isDoctor?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isAdmin = false,
  isDoctor = false,
}: DataTableProps<TData, TValue>) {
  const router = useRouter();
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const encryptedKey =
    typeof window !== "undefined"
      ? window.localStorage.getItem("accessKey")
      : null;

  useEffect(() => {
    if (!isAdmin) return;

    const accessKey = encryptedKey && decryptKey(encryptedKey);

    if (accessKey !== process.env.NEXT_PUBLIC_ADMIN_PASSKEY!.toString()) {
      router.push("/");
    }
  }, [encryptedKey, router, isAdmin]);

  // Update column filters when status filter changes
  useEffect(() => {
    if (statusFilter === "all") {
      setColumnFilters((prev) => prev.filter((filter) => filter.id !== "status"));
    } else {
      setColumnFilters((prev) => {
        const filtered = prev.filter((filter) => filter.id !== "status");
        return [...filtered, { id: "status", value: statusFilter }];
      });
    }
  }, [statusFilter]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    globalFilterFn: (row, columnId, filterValue) => {
      // Custom global filter function that searches across all columns
      const searchValue = filterValue.toLowerCase();
      const rowData = row.original as any;
      
      // Search in patient name
      if (rowData.patient?.name?.toLowerCase().includes(searchValue)) return true;
      
      // Search in appointment ID
      if (rowData.id?.toLowerCase().includes(searchValue)) return true;
      
      // Search in status
      if (rowData.status?.toLowerCase().includes(searchValue)) return true;
      
      // Search in reason
      if (rowData.reason?.toLowerCase().includes(searchValue)) return true;
      
      // Search in doctor name (if available)
      if (rowData.doctor?.toLowerCase().includes(searchValue)) return true;
      
      // Search in schedule date/time
      if (rowData.schedule) {
        const scheduleStr = new Date(rowData.schedule).toLocaleString().toLowerCase();
        if (scheduleStr.includes(searchValue)) return true;
      }
      
      return false;
    },
    state: {
      globalFilter,
      columnFilters,
    },
    initialState: {
      columnVisibility: {
        hasVisited: isDoctor,
      },
    },
  });

  return (
    <div className="data-table space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 bg-dark-400 rounded-lg border border-dark-500">
        <div className="flex-1 w-full sm:max-w-md">
          <Input
            placeholder="Search appointments..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full bg-dark-500 border-dark-600 text-white placeholder:text-dark-700"
          />
        </div>
        <div className="flex gap-2 items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-dark-500 border-dark-600 text-white">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-dark-500 border-dark-600">
              <SelectItem value="all" className="text-white hover:bg-dark-600">All Status</SelectItem>
              <SelectItem value="pending" className="text-white hover:bg-dark-600">Pending</SelectItem>
              <SelectItem value="scheduled" className="text-white hover:bg-dark-600">Scheduled</SelectItem>
              <SelectItem value="cancelled" className="text-white hover:bg-dark-600">Cancelled</SelectItem>
              <SelectItem value="visited" className="text-white hover:bg-dark-600">Visited</SelectItem>
              <SelectItem value="notVisited" className="text-white hover:bg-dark-600">Not Visited</SelectItem>
              <SelectItem value="waitingList" className="text-white hover:bg-dark-600">Waiting List</SelectItem>
            </SelectContent>
          </Select>
          {(globalFilter || statusFilter !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setGlobalFilter("");
                setStatusFilter("all");
              }}
              className="bg-dark-500 border-dark-600 text-white hover:bg-dark-600"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-dark-700 px-2">
        Showing {table.getFilteredRowModel().rows.length} of {data.length} appointments
      </div>

      <Table className="shad-table">
        <TableHeader className=" bg-dark-200">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="shad-table-row-header">
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows && table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className="shad-table-row"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="table-actions">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="shad-gray-btn"
        >
          <Image
            src="/assets/icons/arrow.svg"
            width={24}
            height={24}
            alt="arrow"
          />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="shad-gray-btn"
        >
          <Image
            src="/assets/icons/arrow.svg"
            width={24}
            height={24}
            alt="arrow "
            className="rotate-180"
          />
        </Button>
      </div>
    </div>
  );
}
