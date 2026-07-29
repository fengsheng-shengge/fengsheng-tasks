export default {
  async fetch(request) {
    const url = new URL(request.url);
    const host = url.hostname;

    if (host === 'fengsheng.pages.dev') {
      const redirectUrl = 'https://fengsheng.tech' + url.pathname + url.search;
      return Response.redirect(redirectUrl, 301);
    }

    return fetch(request);
  }
};
