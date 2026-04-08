default:
    @just --list

install:
    pnpm install

validate:
    node ./scripts/validate-games.mjs

package game="":
    #!/usr/bin/env bash
    if [ -n "{{game}}" ]; then
        node ./scripts/package-games.mjs --game "{{game}}"
    else
        node ./scripts/package-games.mjs
    fi

lint:
    pnpm lint

fmt:
    pnpm format

check:
    pnpm check

serve game port="8000":
    pnpm dlx serve games/{{game}}/src -l {{port}}

clean:
    rm -f dist/*.zip
