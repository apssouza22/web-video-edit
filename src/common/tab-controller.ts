export class TabController {
  #tabButtons: NodeListOf<HTMLElement>;
  #tabContents: NodeListOf<HTMLElement>;
  #activeTab: string;

  constructor(containerId: string = 'leftNav') {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }

    this.#tabButtons = container.querySelectorAll('.tab-button');
    this.#tabContents = container.querySelectorAll('.tab-content');
    
    const activeButton = container.querySelector('.tab-button.active') as HTMLElement;
    this.#activeTab = activeButton?.dataset.tab || 'transcription';
    
    this.#attachEventListeners();
  }

  #attachEventListeners(): void {
    this.#tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabName = button.dataset.tab;
        if (tabName) {
          this.switchTab(tabName);
        }
      });
    });
  }

  switchTab(tabName: string): void {
    if (this.#activeTab === tabName) {
      return;
    }

    this.#tabButtons.forEach(button => {
      if (button.dataset.tab === tabName) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });

    this.#tabContents.forEach(content => {
      if (content.id === tabName) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });

    this.#activeTab = tabName;
  }

  getActiveTab(): string {
    return this.#activeTab;
  }
}

