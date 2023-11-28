document.addEventListener('alpine:init', () => {
  Alpine.data('ThemeComponent_PredictiveSearch', (resources) => {
    return {
      cachedResults: {},
      loading: false,
      rawQuery: '',
      results: false,
      resultsMarkup: null,
      _currentResultsGroup: '',
      resources: resources,
      get currentResultsGroup() {
        return this._currentResultsGroup;
      },
      set currentResultsGroup(newValue) {
        if (newValue === '') {
          this._currentResultsGroup = newValue;
          return;
        }

        if (this._currentResultsGroup === '') {
          if (this.$refs[`${newValue}Results`]) {
            this.$refs[`${newValue}Results`].hidden = false;
          }

          this._currentResultsGroup = newValue;
          return;
        }

        const currentResultsGroupEl =
          this.$refs[`${this._currentResultsGroup}Results`];

        this._currentResultsGroup = newValue;

        const nextResultsGroupEl = this.$refs[`${newValue}Results`];

        currentResultsGroupEl.animate(
          {
            opacity: [1, 0],
            scale: [1, 0.95],
          },
          { duration: 333, easing: 'ease' }
        ).onfinish = () => {
          currentResultsGroupEl.hidden = true;
          nextResultsGroupEl.hidden = false;

          nextResultsGroupEl.animate(
            {
              opacity: [0, 1],
              scale: [1.05, 1],
            },
            { duration: 333, easing: 'ease' }
          );
        };
      },
      get trimmedQuery() {
        return this.rawQuery.trim();
      },
      mounted() {
        this.cachedResults = {};

        const toggles = document.querySelectorAll('[data-open-search]');
        toggles.forEach((toggle) => {
          toggle.setAttribute('role', 'button');
        });

        document.addEventListener('keyup', (event) => {
          if (event.key === 'Escape') {
            this.close(false, true);
            setTimeout(() => this.$refs.input.focus(), 100);
          }
        });

        this.$watch('results', (value) => {
          if (value === true) {
            this.$refs.results.hidden = false;
          } else {
            this.$refs.results.animate(
              {
                opacity: [1, 0],
                scale: [1, 0.95],
              },
              { duration: 333, easing: 'ease' }
            ).onfinish = () => {
              this.$refs.results.hidden = true;
            };
          }
        });
      },
      close(clearSearchTerm = false, closeButton = false) {
        if (clearSearchTerm) {
          this.rawQuery = '';
          this.results = false;
        }

        if (closeButton) {
          setTimeout(() => {
            Alpine.store('modals').close('search');
          }, 350);

          setTimeout(() => {
            const selected = this.$el.querySelector('[aria-selected="true"]');
            if (selected) selected.setAttribute('aria-selected', false);
            this.$refs.input.setAttribute('aria-activedescendant', '');
            this.$refs.input.setAttribute('aria-expanded', false);
            document.documentElement.style.overflowY = 'auto';

            const toggleSearch = document.querySelector('[data-open-search]');
            if (toggleSearch) {
              setTimeout(() => toggleSearch.focus(), 100);
            }
          }, 585);
        }
      },
      getSearchResults() {
        this.loading = true;

        const queryKey = this.trimmedQuery.replace(' ', '-').toLowerCase();

        liveRegion(window.theme.strings.loading);

        if (this.cachedResults[queryKey]) {
          this.renderSearchResults(this.cachedResults[queryKey].resultsMarkup);
          liveRegion(this.cachedResults[queryKey].liveRegionText);

          this.results = true;
          this.loading = false;

          return;
        }

        fetch(
          `${window.theme.routes.predictive_search_url}?q=${encodeURIComponent(
            this.trimmedQuery
          )}&${encodeURIComponent('resources[type]')}=${
            this.resources
          }&${encodeURIComponent(
            'resources[limit]'
          )}=10&section_id=predictive-search`
        )
          .then((response) => {
            if (!response.ok) {
              const error = new Error(response.status);
              this.close();
              throw error;
            }

            return response.text();
          })
          .then((text) => {
            const resultsMarkup = new DOMParser()
              .parseFromString(text, 'text/html')
              .querySelector('#shopify-section-predictive-search').innerHTML;
            const liveRegionText = new DOMParser()
              .parseFromString(text, 'text/html')
              .querySelector('#predictive-search-count').textContent;

            this.cachedResults[queryKey] = {
              resultsMarkup: resultsMarkup,
              liveRegionText: liveRegionText,
            };

            this.renderSearchResults(resultsMarkup);
            liveRegion(liveRegionText);

            this.results = true;
            this.loading = false;
          })
          .catch((error) => {
            this.close();
            throw error;
          });
      },
      onChange() {
        if (!this.trimmedQuery.length) {
          this.close(true);
        } else {
          this.getSearchResults();
        }
      },
      onFocus() {
        if (!this.trimmedQuery.length) return;

        if (this.results !== true) {
          this.getSearchResults();
        }
      },
      onFocusOut() {
        setTimeout(() => {
          if (!this.$el.contains(document.activeElement)) this.close();
        });
      },
      onFormSubmit(event) {
        if (
          !this.trimmedQuery.length ||
          this.$el.querySelector('[aria-selected="true"] a')
        )
          event.preventDefault();
      },
      onKeyup(event) {
        event.preventDefault();
        switch (event.code) {
          case 'ArrowUp':
            this.switchOption('up');
            break;
          case 'ArrowDown':
            this.switchOption('down');
            break;
          case 'Enter':
            this.selectOption();
            break;
        }
      },
      onKeydown(event) {
        // Prevent the cursor from moving in the input when using the up and down arrow keys
        if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
          event.preventDefault();
        }
      },
      setInitialResultsGroup() {
        if (this.$refs.groupToggles) {
          this.currentResultsGroup = this.$refs.groupToggles.querySelector(
            'input[type="radio"]'
          ).value;
        } else {
          this.currentResultsGroup = 'products';
        }
      },
      renderSearchResults(resultsMarkup) {
        this.$refs.results.innerHTML = resultsMarkup;
        this.currentResultsGroup = '';

        this.$nextTick(() => {
          this.setInitialResultsGroup();
        });
      },
      selectOption() {
        const selectedProduct = this.$el.querySelector(
          '[aria-selected="true"] a, [aria-selected="true"] button'
        );

        if (selectedProduct) selectedProduct.click();
      },
      switchOption(direction) {
        const moveUp = direction === 'up';
        const selectedElement = this.$el.querySelector(
          '[aria-selected="true"]'
        );
        const allElements = this.$el.querySelectorAll('li');
        let activeElement = this.$el.querySelector('li');

        if (moveUp && !selectedElement) return;

        if (!moveUp && selectedElement) {
          activeElement = selectedElement.nextElementSibling || allElements[0];
        } else if (moveUp) {
          activeElement =
            selectedElement.previousElementSibling ||
            allElements[allElements.length - 1];
        }

        if (activeElement === selectedElement) return;

        activeElement.setAttribute('aria-selected', true);

        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

        if (selectedElement)
          selectedElement.setAttribute('aria-selected', false);

        this.$refs.input.setAttribute(
          'aria-activedescendant',
          activeElement.id
        );
      },
    };
  });
});
