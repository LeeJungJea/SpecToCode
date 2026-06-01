// c:\AI\SpecToCode\src\generators\generatorRegistry.ts 파일의 전체 내용입니다.
import React, { ReactNode } from 'react';
import { 
  SiReact, SiNextdotjs, SiVuedotjs, SiNuxt, SiAngular, SiSvelte, SiSolid, SiPreact,
  SiJavascript, SiTypescript, SiSpringboot, SiNodedotjs, SiFastapi, SiGo, 
  SiDotnet, SiLaravel, SiRubyonrails, SiKotlin, SiRust, SiElixir 
} from 'react-icons/si';
import type { BackendLanguage, FrontendLanguage, GeneratedCodeResult, ParsedApiSpec } from '../types/specToCode';
import { javaSpringBootGenerator } from './javaSpringBootGenerator';
import { reactTypeScriptGenerator } from './reactTypeScriptGenerator';
import FRONTEND_GENERATORS from './frontendGenerators';
import BACKEND_GENERATORS from './backendGenerators';

export const FRONTEND_LANGUAGES: Array<{ value: FrontendLanguage; label: string; icon?: ReactNode }> = [
  { value: 'REACT_TYPESCRIPT', label: 'React TypeScript', icon: <SiReact className="text-[#61DAFB]" /> },
  { value: 'NEXT_JS', label: 'Next.js (React)', icon: <SiNextdotjs className="text-white" /> },
  { value: 'VUE_3', label: 'Vue 3', icon: <SiVuedotjs className="text-[#4FC08D]" /> },
  { value: 'NUXT_JS', label: 'Nuxt.js (Vue)', icon: <SiNuxt className="text-[#00DC82]" /> },
  { value: 'ANGULAR', label: 'Angular', icon: <SiAngular className="text-[#DD0031]" /> },
  { value: 'SVELTE', label: 'Svelte', icon: <SiSvelte className="text-[#FF3E00]" /> },
  { value: 'SOLID_JS', label: 'Solid.js', icon: <SiSolid className="text-[#2C4F7C]" /> },
  { value: 'PREACT', label: 'Preact', icon: <SiPreact className="text-[#673AB8]" /> },
  { value: 'VANILLA_TYPESCRIPT', label: 'Vanilla TypeScript', icon: <SiTypescript className="text-[#3178C6]" /> },
  { value: 'VANILLA_JAVASCRIPT', label: 'Vanilla JavaScript', icon: <SiJavascript className="text-[#F7DF1E]" /> }
];

export const BACKEND_LANGUAGES: Array<{ value: BackendLanguage; label: string; icon?: ReactNode }> = [
  { value: 'JAVA_SPRING_BOOT', label: 'Java Spring Boot', icon: <SiSpringboot className="text-[#6DB33F]" /> },
  { value: 'NODE_TYPESCRIPT', label: 'Node (TypeScript)', icon: <SiNodedotjs className="text-[#339933]" /> },
  { value: 'PYTHON_FASTAPI', label: 'Python FastAPI', icon: <SiFastapi className="text-[#009688]" /> },
  { value: 'GO_GIN', label: 'Go (Gin)', icon: <SiGo className="text-[#00ADD8]" /> },
  { value: 'CSHARP_DOTNET', label: 'C# .NET', icon: <SiDotnet className="text-[#512BD4]" /> },
  { value: 'PHP_LARAVEL', label: 'PHP Laravel', icon: <SiLaravel className="text-[#FF2D20]" /> },
  { value: 'RUBY_ON_RAILS', label: 'Ruby on Rails', icon: <SiRubyonrails className="text-[#CC0000]" /> },
  { value: 'KOTLIN_KTOR', label: 'Kotlin Ktor', icon: <SiKotlin className="text-[#7F52FF]" /> },
  { value: 'RUST_ACTIX', label: 'Rust Actix', icon: <SiRust className="text-white" /> },
  { value: 'ELIXIR_PHOENIX', label: 'Elixir Phoenix', icon: <SiElixir className="text-[#4E2A8E]" /> }
];

export const generateCode = (
  spec: ParsedApiSpec,
  frontendLanguage: FrontendLanguage,
  backendLanguage: BackendLanguage
): GeneratedCodeResult => {
  const frontendGen = FRONTEND_GENERATORS[frontendLanguage];
  if (!frontendGen) throw new Error('지원하지 않는 프론트엔드 언어 선택입니다.');

  const backendGen = BACKEND_GENERATORS[backendLanguage];
  if (!backendGen) throw new Error('지원하지 않는 백엔드 언어 선택입니다.');

  return {
    frontend: {
      types: frontendGen.generateTypes(spec),
      fetchFunction: frontendGen.generateFetchFunction(spec)
    },
    backend: {
      requestDto: backendGen.generateRequestDto(spec),
      responseDto: backendGen.generateResponseDto(spec),
      controllerMethod: backendGen.generateControllerMethod(spec)
    }
  };
};
