const SIDEBAR_TITLE = "Element Evidence";
const SIDEBAR_PAGE = "src/app/sidebar/sidebar.html";

chrome.devtools.panels.elements.createSidebarPane(SIDEBAR_TITLE, (sidebar) => {
  sidebar.setPage(SIDEBAR_PAGE);
});
