import { initDetailPageScript } from "./detail-page";
import { initSearchResultsScript } from "./search-results";

const path = window.location.pathname;
console.log("[gdc] content script loaded on", path);

if (path === "/gds" || path.startsWith("/gds/")) {
  initSearchResultsScript();
} else if (path.startsWith("/geo/query/acc.cgi")) {
  initDetailPageScript();
}
