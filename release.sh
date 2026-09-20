#!/bin/bash

# Script para publicar uma nova versão no NPM e criar release no GitHub
# Uso: ./release.sh [patch|minor|major|current]

set -e  # Para na primeira falha

# Verifica se passou o tipo de versão
if [ -z "$1" ]; then
    echo "❌ Erro: Especifique o tipo de versão (patch, minor, major ou current)"
    echo "Uso: ./release.sh [patch|minor|major|current]"
    echo ""
    echo "Exemplos:"
    echo "  ./release.sh current  # Publica a versão atual do package.json"
    echo "  ./release.sh patch    # 1.0.0 → 1.0.1 (bug fixes)"
    echo "  ./release.sh minor    # 1.0.0 → 1.1.0 (novas features)"
    echo "  ./release.sh major    # 1.0.0 → 2.0.0 (breaking changes)"
    exit 1
fi

VERSION_TYPE=$1

echo "🔍 Verificando pré-requisitos..."

# Verifica se está logado no NPM
if ! npm whoami &> /dev/null; then
    echo "❌ Erro: Você não está logado no NPM"
    echo "Execute: npm login"
    exit 1
fi

# Verifica se está logado no GitHub CLI
if ! gh auth status &> /dev/null; then
    echo "❌ Erro: Você não está autenticado no GitHub CLI"
    echo "Execute: gh auth login"
    exit 1
fi

# Verifica se há mudanças não commitadas
if [[ -n $(git status -s) ]]; then
    echo "❌ Erro: Você tem mudanças não commitadas"
    echo "Commit ou descarte suas mudanças antes de publicar"
    git status -s
    exit 1
fi

echo "✅ Pré-requisitos OK"
echo ""

echo "🔨 Executando testes e build..."
npm run typecheck
npm run build
echo "✅ Build completado"
echo ""

if [ "$VERSION_TYPE" = "current" ]; then
    # Usa a versão atual do package.json
    NEW_VERSION="v$(node -p "require('./package.json').version")"
    echo "📦 Usando versão atual: $NEW_VERSION"
    echo ""
    
    # Cria a tag
    git tag $NEW_VERSION
else
    # Atualiza a versão
    echo "📦 Atualizando versão ($VERSION_TYPE)..."
    NEW_VERSION=$(npm version $VERSION_TYPE --no-git-tag-version)
    echo "✅ Nova versão: $NEW_VERSION"
    echo ""
    
    # Commit da mudança de versão
    git add package.json package-lock.json 2>/dev/null || git add package.json
    git commit -m "chore: release $NEW_VERSION"
    
    # Cria a tag
    git tag $NEW_VERSION
fi

echo "🚀 Fazendo push para o GitHub..."
git push && git push --tags
echo "✅ Push completado"
echo ""

echo "📤 Publicando no NPM..."
npm publish
echo "✅ Publicado no NPM!"
echo ""

echo "🎉 Criando release no GitHub..."
gh release create $NEW_VERSION \
    --title "$NEW_VERSION" \
    --generate-notes \
    --verify-tag

echo ""
echo "✨ Tudo pronto!"
echo "📦 NPM: https://www.npmjs.com/package/@0x3639/intervals-icu"
echo "🏷️  GitHub Release: https://github.com/0x3639/node-intervals-icu/releases/tag/$NEW_VERSION"
