import type {
  FamilyAdapterAlgorithmDefinition,
  FamilyAdapterDefinition,
  FamilyAdapterKind,
  FamilyAdapterVisualFamily,
  VisualRendererFamily,
} from "./types"

type Assert<T extends true> = T
type Adapter<
  TKind extends FamilyAdapterKind,
  TFamilyKind extends FamilyAdapterKind,
> = FamilyAdapterDefinition<TKind> & {
  adapter: true
  family: FamilyAdapterVisualFamily<TFamilyKind>
}

type WrongFamily = {
  sort: "graph"
  graph: "search"
  search: "string"
  string: "pointers"
  pointers: "dp"
  dp: "sort"
}

type MatchingPairs = {
  [TKind in FamilyAdapterKind]: Adapter<
    TKind,
    TKind
  > extends FamilyAdapterAlgorithmDefinition<TKind>
    ? true
    : false
}[FamilyAdapterKind]

type MismatchedPairs = {
  [TKind in FamilyAdapterKind]: Adapter<
    TKind,
    WrongFamily[TKind]
  > extends FamilyAdapterAlgorithmDefinition<TKind>
    ? false
    : true
}[FamilyAdapterKind]

type WrongSortFrameFamily = VisualRendererFamily<{ wrong: true }> & { id: "array-sort" }
type WrongFrameFamily<TKind extends FamilyAdapterKind> = VisualRendererFamily<{
  wrong: TKind
}> & { id: FamilyAdapterVisualFamily<TKind>["id"] }
type MismatchedFrames = {
  [TKind in FamilyAdapterKind]: WrongFrameFamily<TKind> extends FamilyAdapterVisualFamily<TKind>
    ? false
    : true
}[FamilyAdapterKind]

type AcceptsAllSixMatchingFamilies = Assert<MatchingPairs extends true ? true : false>
type RejectsAllSixMismatchedFamilies = Assert<MismatchedPairs extends true ? true : false>
type RejectsWrongSortFrame = Assert<
  WrongSortFrameFamily extends FamilyAdapterVisualFamily<"sort"> ? false : true
>
type RejectsAllSixWrongFrames = Assert<MismatchedFrames extends true ? true : false>
