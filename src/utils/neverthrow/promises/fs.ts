import { access, mkdir, rm, unlink, writeFile } from "fs/promises";

import asyncResultWrapper from "./wrapper.js";

export const safeAccess = asyncResultWrapper(access);
export const safeMkdir = asyncResultWrapper(mkdir);
export const safeWriteFile = asyncResultWrapper(writeFile);
export const safeRm = asyncResultWrapper(rm);
export const safeUnlink = asyncResultWrapper(unlink);
