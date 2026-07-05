/* ============================================
   SERVINOW — App Initialization
   Global setup, theme, and shared components
   ============================================ */

const App = {
  /**
   * Initialize the application
   * @param {object} options
   * @param {string} options.pageId - Current page identifier
   * @param {string} options.pageTitle - Page title for navbar
   * @param {Array} options.breadcrumb - Breadcrumb items
   * @param {Function} options.onReady - Callback when app is ready
   */
  init({ pageId, pageTitle, breadcrumb = [], onReady = null }) {
    // Apply saved theme
    const theme = Storage.getTheme();
    document.documentElement.setAttribute('data-theme', theme);

    // Wait for DOM
    document.addEventListener('DOMContentLoaded', () => {
      // Render shared components
      Sidebar.render(pageId);
      Navbar.render(pageTitle, breadcrumb);

      // Initialize Lucide icons
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }

      // Initialize reveal animations
      Helpers.initRevealAnimations();

      // Handle responsive sidebar on resize
      let prevWidth = window.innerWidth;
      window.addEventListener('resize', Helpers.debounce(() => {
        const width = window.innerWidth;
        if (prevWidth > 768 && width <= 768) {
          Sidebar.closeMobile();
        }
        prevWidth = width;
      }, 150));

      // Page-specific initialization
      if (onReady) onReady();
    });
  },

  /**
   * Get common HTML head content
   * @returns {string}
   */
  getHeadHTML() {
    return `
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="description" content="Servinow - Gestor de productos y servicios para negocios que sirven">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link rel="stylesheet" href="css/variables.css">
      <link rel="stylesheet" href="css/reset.css">
      <link rel="stylesheet" href="css/base.css">
      <link rel="stylesheet" href="css/animations.css">
      <link rel="stylesheet" href="css/components.css">
      <link rel="stylesheet" href="css/layout.css">
      <link rel="stylesheet" href="css/utilities.css">
    `;
  },

  /**
   * Get common script tags
   * @returns {string}
   */
  getScriptsHTML() {
    return `
      <script src="https://unpkg.com/lucide@latest"></script>
      <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
      <script src="js/config.js"></script>
      <script src="js/utils/helpers.js"></script>
      <script src="js/utils/storage.js"></script>
      <script src="js/utils/mockData.js"></script>
      <script src="js/components/sidebar.js"></script>
      <script src="js/components/navbar.js"></script>
      <script src="js/components/modal.js"></script>
      <script src="js/components/toast.js"></script>
      <script src="js/components/table.js"></script>
      <script src="js/components/chart.js"></script>
      <script src="js/app.js"></script>
    `;
  }
};
