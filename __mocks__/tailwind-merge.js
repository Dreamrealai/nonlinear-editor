const twMerge = (...classes) =>
  classes
    .flat()
    .filter(Boolean)
    .map((value) => (typeof value === 'string' ? value : String(value)))
    .join(' ');

module.exports = { twMerge };
