/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as contests from "../contests.js";
import type * as grading from "../grading.js";
import type * as leaderboard from "../leaderboard.js";
import type * as participants from "../participants.js";
import type * as seed from "../seed.js";
import type * as sqlWasmBinary from "../sqlWasmBinary.js";
import type * as submissionStore from "../submissionStore.js";
import type * as submissions from "../submissions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  contests: typeof contests;
  grading: typeof grading;
  leaderboard: typeof leaderboard;
  participants: typeof participants;
  seed: typeof seed;
  sqlWasmBinary: typeof sqlWasmBinary;
  submissionStore: typeof submissionStore;
  submissions: typeof submissions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
