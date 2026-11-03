/** Runs only in the original-reference page; trusted keys are supplied by its browser driver. */
export function installKeyboardReference(
  React,
  createRoot,
  flushSync,
  { Checkbox, Radio, RadioGroup },
) {
  let current;
  window.mountKeyboardReference = (test) => {
    if (current) {
      flushSync(() => current.root.unmount());
      current.container.remove();
    }
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container),
      trace = [];
    const onKeyDown = (event) => {
      if (test.cancelSpace && event.key === ' ') event.preventDefault();
    };
    const options = test.options ?? [
      { id: 'a', value: 'a' },
      { id: 'b', value: 'b' },
      { id: 'c', value: 'c' },
    ];
    const change = (id) => (event, checked) =>
      trace.push({ id, checked, value: event.target.value, name: event.target.name });
    const body =
      test.kind === 'Checkbox'
        ? React.createElement(Checkbox, {
            id: 'a',
            onChange: change('a'),
            slotProps: { input: { onKeyDown } },
          })
        : React.createElement(
            RadioGroup,
            {
              defaultValue: 'a',
              name: 'choice',
              style: { direction: test.rtl ? 'rtl' : 'ltr' },
              onChange: (_event, value) => trace.push({ group: value }),
            },
            options.map((option) =>
              React.createElement(Radio, {
                key: option.id,
                ...option,
                onChange: change(option.id),
                slotProps: { input: { onKeyDown } },
              }),
            ),
          );
    flushSync(() => root.render(body));
    current = { root, container, trace };
  };
  window.readKeyboardReference = () => ({
    active: document.activeElement?.id ?? '',
    controls: Array.from(current.container.querySelectorAll('input'), (node) => ({
      id: node.id,
      checked: node.checked,
      value: node.value,
      name: node.name,
      disabled: node.disabled,
    })),
    trace: current.trace.slice(),
  });
  window.clearKeyboardReference = () => {
    if (current) {
      flushSync(() => current.root.unmount());
      current.container.remove();
      current = null;
    }
  };
}
