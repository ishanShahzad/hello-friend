export const toPlainOptions = (value) => {
  if (!value) return {};
  if (value instanceof Map) return Object.fromEntries(value.entries());
  if (typeof value === 'object') return { ...value };
  return {};
};

const clean = (value) => String(value ?? '').trim();

export const getOrderItemOptionPairs = (item = {}) => {
  const pairs = [];
  const selectedOptions = toPlainOptions(item.selectedOptions);

  Object.entries(selectedOptions).forEach(([name, value]) => {
    const key = clean(name);
    const val = clean(value);
    if (key && val) pairs.push({ name: key, value: val });
  });

  const selectedColor = clean(item.selectedColor);
  const hasColorOption = pairs.some(pair => pair.name.toLowerCase() === 'color');
  if (selectedColor && !hasColorOption) pairs.push({ name: 'Color', value: selectedColor });

  return pairs;
};

export const formatOrderItemOptions = (item = {}) =>
  getOrderItemOptionPairs(item).map(pair => `${pair.name}: ${pair.value}`).join(', ');

export const hasOrderItemOptions = (item = {}) => getOrderItemOptionPairs(item).length > 0;
