import { javaSpringBootGenerator } from './javaSpringBootGenerator';
import { nodeTypeScriptGenerator } from './nodeTypeScriptGenerator';
import { pythonFastApiGenerator } from './pythonFastApiGenerator';
import { goGenerator } from './goGenerator';
import { csharpDotnetGenerator } from './csharpDotnetGenerator';
import { phpLaravelGenerator } from './phpLaravelGenerator';
import { rubyOnRailsGenerator } from './rubyOnRailsGenerator';
import { kotlinKtorGenerator } from './kotlinKtorGenerator';
import { rustActixGenerator } from './rustActixGenerator';
import { elixirPhoenixGenerator } from './elixirPhoenixGenerator';

export const BACKEND_GENERATORS: Record<string, any> = {
  JAVA_SPRING_BOOT: javaSpringBootGenerator,
  NODE_TYPESCRIPT: nodeTypeScriptGenerator,
  PYTHON_FASTAPI: pythonFastApiGenerator,
  GO_GIN: goGenerator,
  CSHARP_DOTNET: csharpDotnetGenerator,
  PHP_LARAVEL: phpLaravelGenerator,
  RUBY_ON_RAILS: rubyOnRailsGenerator,
  KOTLIN_KTOR: kotlinKtorGenerator,
  RUST_ACTIX: rustActixGenerator,
  ELIXIR_PHOENIX: elixirPhoenixGenerator
};

export default BACKEND_GENERATORS;
