import { getMessage } from "../../platform/chrome/i18n.js";

document.title = getMessage("devtoolsPageTitle", document.title);

const SIDEBAR_TITLE = getMessage("devtoolsSidebarTitle", "Element Evidence");
const SIDEBAR_PAGE = "src/app/sidebar/sidebar.html";

chrome.devtools.panels.elements.createSidebarPane(SIDEBAR_TITLE, (sidebar) => {
  sidebar.setPage(SIDEBAR_PAGE);
});
