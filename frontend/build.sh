#!/bin/sh
# Garante que utils.ts existe antes de buildar
mkdir -p src/lib
if [ ! -f src/lib/utils.ts ]; then
  echo "Criando src/lib/utils.ts..."
  cat > src/lib/utils.ts << 'UTILS'
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
UTILS
fi
npm run build
