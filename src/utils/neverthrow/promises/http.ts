import asyncResultWrapper from "./wrapper.js";

export const safeFetch = asyncResultWrapper(fetch);
