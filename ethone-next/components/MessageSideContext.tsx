"use client";

import { createContext } from "react";

export type MessageSide = "start" | "end" | null;

export const MessageSideContext = createContext<MessageSide>(null);
