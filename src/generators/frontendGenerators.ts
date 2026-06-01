import type { ParsedApiSpec } from '../types/specToCode';
import { reactTypeScriptGenerator } from './reactTypeScriptGenerator';
import { nextJsGenerator } from './nextJsGenerator';
import { vueGenerator } from './vueGenerator';
import { nuxtGenerator } from './nuxtGenerator';
import { angularGenerator } from './angularGenerator';
import { svelteGenerator } from './svelteGenerator';
import { solidGenerator } from './solidGenerator';
import { preactGenerator } from './preactGenerator';
import { vanillaTypeScriptGenerator } from './vanillaTypeScriptGenerator';
import { vanillaJavaScriptGenerator } from './vanillaJavaScriptGenerator';

type FrontendGen = {
  generateTypes: (spec: ParsedApiSpec) => string;
  generateFetchFunction: (spec: ParsedApiSpec) => string;
};

export const FRONTEND_GENERATORS: Record<string, FrontendGen> = {
  REACT_TYPESCRIPT: reactTypeScriptGenerator,
  NEXT_JS: nextJsGenerator,
  VUE_3: vueGenerator,
  NUXT_JS: nuxtGenerator,
  ANGULAR: angularGenerator,
  SVELTE: svelteGenerator,
  SOLID_JS: solidGenerator,
  PREACT: preactGenerator,
  VANILLA_TYPESCRIPT: vanillaTypeScriptGenerator,
  VANILLA_JAVASCRIPT: vanillaJavaScriptGenerator
};

export default FRONTEND_GENERATORS;
