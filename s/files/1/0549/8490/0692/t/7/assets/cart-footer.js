document.addEventListener('alpine:init', () => {
  Alpine.data('ThemeModule_CartFooter', () => {
    return {
      footerRoot: null,
      _morphFooter(e) {
        const newFooterSection = querySelectorInHTMLString(
          '[data-cart-footer]',
          e.detail.response.sections['cart-footer']
        );

        Alpine.morph(
          this.footerRoot,
          newFooterSection ? newFooterSection.outerHTML : ''
        );
      },
      init() {
        this.footerRoot = this.$root;

        window.addEventListener('cascade:modalcart:afteradditem', (e) => {
          this._morphFooter(e);
        });

        window.addEventListener('cascade:modalcart:cartqtychange', (e) => {
          this._morphFooter(e);
        });
      },
    };
  });
});
