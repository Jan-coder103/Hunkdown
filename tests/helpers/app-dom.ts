/** Minimal DOM port for application flow tests; rendering stays on real Three.js objects. */
export class AppElement extends EventTarget {
  readonly dataset: Record<string, string> = {};
  readonly attributes = new Map<string, string>();
  readonly children: AppElement[] = [];
  parentElement: AppElement | null = null;
  hidden = false;
  disabled = false;
  textContent = '';
  className = '';
  value = '';
  private markup = '';
  private readonly classes = new Set<string>();
  private readonly descendants: AppElement[] = [];
  readonly classList = {
    add: (name: string) => { this.classes.add(name); },
    toggle: (name: string, force: boolean) => { if (force) this.classes.add(name); else this.classes.delete(name); },
  };

  get valueAsNumber(): number { return Number(this.value); }
  get innerHTML(): string { return this.markup; }
  set innerHTML(markup: string) {
    this.markup = markup;
    this.descendants.length = 0;
    for (const tag of markup.matchAll(/<[a-z][^>]*>/gi)) {
      const element = new AppElement();
      for (const attribute of tag[0].matchAll(/([\w-]+)="([^"]*)"/g)) element.setAttribute(attribute[1]!, attribute[2]!);
      element.hidden = /\shidden(?:\s|>)/.test(tag[0]);
      this.descendants.push(element);
    }
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
    if (name === 'class') this.className = value;
    if (name === 'value') this.value = value;
    if (name.startsWith('data-')) {
      const key = name.slice(5).replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
      this.dataset[key] = value;
    }
  }

  querySelector<T = AppElement>(selector: string): T | null {
    return (this.querySelectorAll(selector)[0] ?? null) as T | null;
  }

  querySelectorAll(selector: string): AppElement[] {
    return this.descendants.filter((element) => {
      if (selector.startsWith('#')) return element.attributes.get('id') === selector.slice(1);
      if (selector.startsWith('.')) return element.className.split(' ').includes(selector.slice(1));
      if (selector.startsWith('[')) return element.attributes.has(selector.slice(1, -1));
      return false;
    });
  }

  append(...elements: AppElement[]): void {
    for (const element of elements) { element.parentElement = this; this.children.push(element); }
  }

  replaceChildren(...elements: AppElement[]): void { this.children.length = 0; this.append(...elements); }
  click(): void { this.dispatchEvent(new Event('click')); }
  requestPointerLock(): void { /* Native pointer lock requires a browser gesture. */ }
}
