import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteAnime,
  getLibrary,
  getLibraryByStatus,
  saveAnime,
  updateEpisodesSeen,
  updateWatchStatus,
} from "./ipc";
import type { WatchStatus } from "./types";

export function useLibrary(status?: WatchStatus) {
  return useQuery({
    queryKey: ["library", status ?? "all"],
    queryFn: () => (status ? getLibraryByStatus(status) : getLibrary()),
  });
}

function useInvalidateLibrary() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["library"] });
}

export function useSaveAnime() {
  const invalidateLibrary = useInvalidateLibrary();
  return useMutation({
    mutationFn: saveAnime,
    onSuccess: invalidateLibrary,
  });
}

export function useUpdateWatchStatus() {
  const invalidateLibrary = useInvalidateLibrary();
  return useMutation({
    mutationFn: updateWatchStatus,
    onSuccess: invalidateLibrary,
  });
}

export function useUpdateEpisodesSeen() {
  const invalidateLibrary = useInvalidateLibrary();
  return useMutation({
    mutationFn: updateEpisodesSeen,
    onSuccess: invalidateLibrary,
  });
}

export function useDeleteAnime() {
  const invalidateLibrary = useInvalidateLibrary();
  return useMutation({
    mutationFn: deleteAnime,
    onSuccess: invalidateLibrary,
  });
}
