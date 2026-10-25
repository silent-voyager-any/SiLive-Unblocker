(() => {
  const observerKey = "__unblurCurrentTabObserver";
  const blurPattern = /blur/i;

  function unblurElement(element) {
    if (!(element instanceof Element)) {
      return;
    }

    const blurClasses = [...element.classList].filter((name) => blurPattern.test(name));
    const blurAttributes = [...element.attributes].filter((attribute) => {
      if (attribute.name === "class" || attribute.name === "style") {
        return false;
      }

      return blurPattern.test(attribute.name) ||
        (["data-state", "data-status"].includes(attribute.name) && blurPattern.test(attribute.value));
    });
    const wasMarkedAsBlurred = blurClasses.length > 0 || blurAttributes.length > 0;

    for (const className of blurClasses) {
      element.classList.remove(className);
    }

    for (const attribute of blurAttributes) {
      element.removeAttribute(attribute.name);
    }

    if (wasMarkedAsBlurred) {
      element.removeAttribute("hidden");
      element.removeAttribute("aria-hidden");
    }

    const styles = getComputedStyle(element);
    const filter = styles.filter || styles.webkitFilter || "";
    const backdropFilter = styles.backdropFilter || styles.webkitBackdropFilter || "";

    if (blurPattern.test(filter)) {
      element.style.setProperty("filter", "none", "important");
      element.style.setProperty("-webkit-filter", "none", "important");
    }

    if (blurPattern.test(backdropFilter)) {
      element.style.setProperty("backdrop-filter", "none", "important");
      element.style.setProperty("-webkit-backdrop-filter", "none", "important");
    }
  }

  function unblurTree(root) {
    unblurElement(root);

    if (root.querySelectorAll) {
      for (const element of root.querySelectorAll("*")) {
        unblurElement(element);
      }
    }
  }

  unblurTree(document);

  if (globalThis[observerKey]) {
    return;
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes") {
        unblurElement(mutation.target);
      }

      for (const node of mutation.addedNodes) {
        unblurTree(node);
      }
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    childList: true,
    subtree: true
  });

  globalThis[observerKey] = observer;
})();
