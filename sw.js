// 「HTMLとCSSの超基本・文法のおさらい」をアプリとして入れられるようにし、
// 一度開いたあとはオフラインでも開けるようにするサービスワーカー。
//
// アプリを更新して公開し直したときは、下の CACHE_NAME の末尾の数字を1つ上げると、
// 古い保存分が確実に片付けられる（上げなくても、オンラインなら常に最新のページが表示される）。
const CACHE_NAME = "html-css-osarai-v1";
const PRECACHE_URLS = [
  "./",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
];

// 入れたとき：ページ本体とアイコンを保存しておく。
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

// 新しい版に切り替わったとき：古い名前の保存分を消す。
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  // ページ本体：まずネットから最新を取り、取れたら保存し直す。つながらないときは保存分を出す。
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          caches
            .match(request, { ignoreSearch: true })
            .then((cached) => cached || caches.match("./")),
        ),
    );
    return;
  }

  // アイコンなど：保存分があればそれを使い、なければネットから取る。
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});
