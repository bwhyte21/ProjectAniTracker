import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteAnime,
  getLibrary,
  getLibraryByStatus,
  saveAnime,
  updateEpisodesSeen,
  updateWatchStatus,
} from "./ipc";
import type { TrackedAnime, WatchStatus } from "./types";

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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveAnime,
    onMutate: async (args) => {
      await queryClient.cancelQueries({ queryKey: ["library"] });
      const previous = queryClient.getQueriesData<TrackedAnime[]>({
        queryKey: ["library"],
      });
      const optimistic: TrackedAnime = {
        anilist_id: args.anilistId,
        title: args.title,
        cover_image_path: "",
        episode_count: args.episodeCount,
        season: args.season,
        year: args.year,
        format: args.format,
        status: args.status,
        episodes_seen: args.episodesSeen,
        saved_at: "",
      };
      const seed = (old: TrackedAnime[] | undefined) =>
        old ? [...old.filter((anime) => anime.anilist_id !== args.anilistId), optimistic] : old;
      queryClient.setQueryData(["library", "all"], seed);
      queryClient.setQueryData(["library", args.status], seed);
      return { previous };
    },
    onError: (_error, _args, context) => {
      context?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["library"] });
    },
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
