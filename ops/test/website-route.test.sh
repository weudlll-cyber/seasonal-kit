#!/usr/bin/env bash
# @file   ops/test/website-route.test.sh
# @brief  The route-file step against the real nginx and Caddy, imported the way the website's own
#         configuration imports it (K72).
#
# Responsibility: for both proxies, the route file `ops/lib/website-route.sh` writes is put in the
#                 folder the website includes (nginx: `include /etc/seasonal/routes/*.conf;` in
#                 the server block, website deploy/install/lib/games.sh; Caddy:
#                 `import /etc/caddy/routes/*.caddy` in the site block, website
#                 deploy/site/Caddyfile; both at cc743b9), the proxy accepts it, and a stand-in
#                 website (authorize) and app in the same container prove what reaches whom: forged
#                 identity headers and secrets are cleared, only the sign-in route carries the
#                 identity and the secret, the website never sees the secret, its session cookie
#                 never reaches the app, a refusal goes to the login route, metrics are 404. Also:
#                 settings that could add a directive are refused, and a file the proxy refuses is
#                 taken back. Run: NGINX_IMAGE=… CADDY_IMAGE=… bash ops/test/website-route.test.sh
#                 (CI job `ops`; needs Docker). Containers and files it made are removed.
set -euo pipefail

: "${NGINX_IMAGE:?set NGINX_IMAGE to the pinned nginx image}"
: "${CADDY_IMAGE:?set CADDY_IMAGE to the pinned Caddy image}"

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
# shellcheck source=SCRIPTDIR/../lib/website-route.sh
source "$root/ops/lib/website-route.sh"

work=$(mktemp -d)
containers=()
cleanup() {
  local c
  for c in "${containers[@]-}"; do [[ -z $c ]] || docker rm -f "$c" >/dev/null 2>&1 || true; done
  rm -rf "$work"
}
trap cleanup EXIT

# Git Bash must not rewrite container paths.
docker() { MSYS_NO_PATHCONV=1 command docker "$@"; }
host_path() { if command -v cygpath >/dev/null; then cygpath -w "$1"; else printf '%s' "$1"; fi; }

failures=0
ok() { printf '  ok   %s\n' "$1"; }
bad() { printf '  FAIL %s\n' "$1"; failures=$((failures + 1)); }
# check <what> <section> <pattern>: the section's answer holds the pattern (an extended regex).
check() {
  if section "$2" | grep -Eq -- "$3"; then ok "$1"; else bad "$1: $(section "$2" | tr '\n' ' ')"; fi
}
refute() {
  if section "$2" | grep -Eq -- "$3"; then bad "$1: $(section "$2" | tr '\n' ' ')"; else ok "$1"; fi
}
section() { awk -v want="== $1" '$0 == want {on=1; next} /^== /{on=0} on' "$work/answers"; }

export SK_ROUTE_GAME=mini-games SK_ROUTE_BASE=/games/mini-games
export SK_ROUTE_SECRET_HEADER=X-Smg-Proxy-Secret SK_ROUTE_SECRET=test-only-proxy-secret
export SK_ROUTE_APP=127.0.0.1:8082 SK_ROUTE_WEBSITE=127.0.0.1:8081

# The requests, raw, so no client adds or hides a header; run inside the proxy's container.
cat >"$work/probe.sh" <<'EOF'
req() {
  name=$1 path=$2
  shift 2
  printf '== %s\n' "$name"
  { printf 'GET %s HTTP/1.0\r\nHost: localhost\r\n' "$path"; for h in "$@"; do printf '%s\r\n' "$h"; done; printf '\r\n'; sleep 1; } |
    nc 127.0.0.1 8080 | tr -d '\r'
  printf '\n'
}
b=/games/mini-games
req guest $b/auth/website "X-Acting-User-Id: 999" "X-Smg-Proxy-Secret: forged" "Cookie: se.sid=none; own=keep"
req member $b/auth/website "Cookie: __Host-se.sid=member; own=1"
req other $b/api "X-Acting-User-Id: 999" "X-Acting-Guest: true" "X-Smg-Proxy-Secret: forged" "Cookie: se.sid=member; own=2"
req onlysession $b/api "Cookie: se.sid=member"
req refused "$b/auth/website?next=%2Fx" "Cookie: se.sid=banned"
req metrics $b/metrics
req bare $b
req site /page
EOF

run_checks() {
  check 'a guest signs in as a guest, with the secret' guest 'id= guest=true secret=test-only-proxy-secret'
  check "the guest's own cookie stays, the website's goes" guest 'cookie=own=keep'
  check "a member's identity comes from the website" member 'id=42 guest= secret=test-only-proxy-secret cookie=own=1'
  check 'every other path clears forged identity and secret' other 'id= guest= secret= cookie=own=2'
  check 'a cookie of the website alone is not sent' onlysession 'id= guest= secret= cookie=$'
  check 'a refusal goes to the login route with the query' refused '^(Location|location): .*/games/mini-games/auth/website/login\?next=%2Fx$'
  check 'metrics are 404' metrics '^HTTP/1\.[01] 404'
  check 'the bare base redirects' bare '^HTTP/1\.[01] 308'
  check "the website's own pages are untouched" site '^site$'
  # The stand-in website answers 500 if the secret reaches it, so no sign-in may be a 500.
  refute 'the website never receives the secret' member '^HTTP/1\.[01] 500'
}

# in_proxy <image> <command> <host file>:<container path>…: runs the proxy with the files, and
# keeps what its probes answered.
in_proxy() {
  local image=$1 command=$2 id pair
  shift 2
  id=$(docker create "$image" sh -c "$command")
  containers+=("$id")
  for pair in "$@"; do docker cp "$(host_path "${pair%%:*}")" "$id:${pair#*:}" >/dev/null; done
  docker start -a "$id" >"$work/answers" 2>&1 || { cat "$work/answers"; return 1; }
}

echo nginx
mkdir -p "$work/seasonal/routes"
sk_route_nginx >"$work/seasonal/routes/mini-games.conf"
cat >"$work/nginx.conf" <<'EOF'
error_log stderr crit;
events {}
http {
  access_log off;
  server {
    listen 127.0.0.1:8081;
    location = /api/games/mini-games/authorize {
      if ($http_x_original_method = "") { return 403; }
      if ($http_x_smg_proxy_secret != "") { return 500; }
      if ($http_cookie ~ "se\.sid=banned") { return 403; }
      set $member "";
      set $guest "true";
      if ($http_cookie ~ "se\.sid=member") { set $member 42; set $guest ""; }
      add_header X-Acting-User-Id $member always;
      add_header X-Acting-Guest $guest always;
      return 204;
    }
  }
  server {
    listen 127.0.0.1:8082;
    location / {
      default_type text/plain;
      return 200 "id=$http_x_acting_user_id guest=$http_x_acting_guest secret=$http_x_smg_proxy_secret cookie=$http_cookie";
    }
  }
  server {
    listen 8080;
    include /etc/seasonal/routes/*.conf;
    location / { return 200 "site"; }
  }
}
EOF
in_proxy "$NGINX_IMAGE" 'nginx -t -q && nginx && sh /probe.sh' \
  "$work/nginx.conf:/etc/nginx/nginx.conf" "$work/seasonal:/etc/seasonal" "$work/probe.sh:/probe.sh"
run_checks

echo caddy
mkdir -p "$work/caddy/routes"
sk_route_caddy >"$work/caddy/routes/mini-games.caddy"
cat >"$work/caddy/Caddyfile" <<'EOF'
{
	admin off
	auto_https off
}
:8081 {
	route {
		@nomethod not header X-Original-Method *
		respond @nomethod 403
		@secret header X-Smg-Proxy-Secret *
		respond @secret 500
		@banned header_regexp Cookie se\.sid=banned
		respond @banned 403
		@member header_regexp Cookie se\.sid=member
		header @member X-Acting-User-Id 42
		respond @member 204
		header X-Acting-Guest true
		respond 204
	}
}
:8082 {
	respond "id={header.X-Acting-User-Id} guest={header.X-Acting-Guest} secret={header.X-Smg-Proxy-Secret} cookie={header.Cookie}" 200
}
:8080 {
	import /etc/caddy/routes/*.caddy
	handle {
		respond "site" 200
	}
}
EOF
in_proxy "$CADDY_IMAGE" 'caddy start --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1 && sleep 1 && sh /probe.sh' \
  "$work/caddy/Caddyfile:/etc/caddy/Caddyfile" "$work/caddy/routes:/etc/caddy/routes" "$work/probe.sh:/probe.sh"
run_checks

echo settings
for setting in 'SK_ROUTE_SECRET=a"; return 200;' 'SK_ROUTE_APP=127.0.0.1:1;evil' 'SK_ROUTE_BASE=/games/x {' \
  'SK_ROUTE_GAME=Bad Name' 'SK_ROUTE_SECRET_HEADER=Cookie' 'SK_ROUTE_IDENTITY_HEADERS=X-A; x' 'SK_ROUTE_AUTHORIZE=/a b'; do
  if out=$( (export "${setting?}"; sk_route_nginx) 2>&1); then bad "refused: ${setting%%=*}"; else
    if [[ $out == *"test-only-proxy-secret"* ]]; then bad "the refusal of ${setting%%=*} says the secret"; else ok "refused: ${setting%%=*}"; fi
  fi
done

echo install
route="$work/routes/mini-games.conf"
mkdir -p "$work/routes"
export SK_ROUTE_MODE=nginx SK_ROUTE_FILE=$route SK_ROUTE_CHECK_CMD=true
export SK_ROUTE_RELOAD_CMD="touch '$work/reloaded'"
said=$(sk_route_install)
if grep -q 'location = /games/mini-games/auth/website' "$route" && [[ -e $work/reloaded ]]; then ok 'written and reloaded'; else bad 'install'; fi
if [[ $said != *"$SK_ROUTE_SECRET"* ]]; then ok 'the install never prints the secret'; else bad 'secret printed'; fi
if [[ $(uname) != Linux || $(stat -c %a "$route") == 600 ]]; then ok 'the file is 0600'; else bad "mode $(stat -c %a "$route")"; fi
echo 'the earlier file' >"$route"
rm "$work/reloaded"
if SK_ROUTE_CHECK_CMD=false sk_route_install 2>/dev/null; then bad 'a refused file is an error'; else ok 'a refused file is an error'; fi
if [[ $(cat "$route") == 'the earlier file' && ! -e $work/reloaded ]]; then ok 'the earlier file is back, nothing reloaded'; else bad 'restore'; fi
rm "$route"
SK_ROUTE_CHECK_CMD=false sk_route_install 2>/dev/null || true
if [[ ! -e $route && -z $(ls "$work/routes") ]]; then ok 'a refused first file leaves nothing behind'; else bad "left: $(ls "$work/routes")"; fi

[[ $failures -eq 0 ]] || { echo "$failures checks failed"; exit 1; }
echo 'all checks passed'
