import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { cn } from "cn";
import { animeCardTitle } from "@/components/anime/AnimeCard";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTopAnime } from "@/lib/anilist/hooks";
import type { AniListMedia } from "@/lib/anilist/types";

const COUNT_OPTIONS = [10, 25, 50, 100] as const;
const PAGE_SIZE = 10;

export const Route = createFileRoute("/top")({
  component: TopPage,
});

function TopPage() {
  const [count, setCount] = useState<number>(25);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });
  const { data, error, isPending, isError } = useTopAnime(count);

  const columns = useMemo<ColumnDef<AniListMedia>[]>(
    () => [
      {
        id: "rank",
        header: "Rank",
        cell: ({ row }) => row.index + 1,
      },
      {
        id: "title",
        header: "Title",
        cell: ({ row }) => (
          <Link
            to="/anime/$id"
            params={{ id: String(row.original.id) }}
            className="hover:underline"
          >
            {animeCardTitle(row.original)}
          </Link>
        ),
      },
      {
        id: "score",
        header: "Score",
        cell: ({ row }) => row.original.averageScore ?? "-",
      },
      {
        id: "episodes",
        header: "Episodes",
        cell: ({ row }) => row.original.episodes ?? "-",
      },
    ],
    [],
  );

  const table = useReactTable({
    data: data ?? [],
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false,
  });

  function handleCountChange(value: string) {
    setCount(Number(value));
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Top Series</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Count</span>
          <Select
            value={String(count)}
            onValueChange={handleCountChange}
            aria-label="Number of results"
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNT_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {isPending && (
        <p className="text-sm text-muted-foreground">Loading top anime...</p>
      )}
      {isError && (
        <p className="text-sm text-muted-foreground">
          Failed to load top anime: {error.message}
        </p>
      )}
      {data && data.length === 0 && (
        <p className="text-sm text-muted-foreground">No anime found.</p>
      )}
      {data && data.length > 0 && (
        <div className="flex flex-col gap-4">
          <Table>
            <TableHeader>
              <TableRow>
                {table.getFlatHeaders().map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </p>
            <Pagination className="mx-0 w-auto justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => table.previousPage()}
                    aria-disabled={!table.getCanPreviousPage()}
                    className={cn(
                      !table.getCanPreviousPage() &&
                        "pointer-events-none opacity-50",
                    )}
                  />
                </PaginationItem>
                {Array.from({ length: table.getPageCount() }, (_, index) => (
                  <PaginationItem key={index}>
                    <PaginationLink
                      onClick={() => table.setPageIndex(index)}
                      isActive={
                        table.getState().pagination.pageIndex === index
                      }
                    >
                      {index + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => table.nextPage()}
                    aria-disabled={!table.getCanNextPage()}
                    className={cn(
                      !table.getCanNextPage() && "pointer-events-none opacity-50",
                    )}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}
    </div>
  );
}
