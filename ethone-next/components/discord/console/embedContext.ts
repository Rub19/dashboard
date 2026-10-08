"use client";

import { createContext, useContext } from "react";

/** Vrai quand une page de module est affichée dans la console (voir ModuleEmbed). */
export const EmbedContext = createContext(false);
export const useConsoleEmbed = () => useContext(EmbedContext);
