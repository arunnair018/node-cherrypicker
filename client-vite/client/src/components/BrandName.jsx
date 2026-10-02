// "Cherrypicker" is the product name; the small faded "node" above it is the package prefix.
const BrandName = ({ className = "" }) => (
  <span className={`brand-name ${className}`}>
    <small>node</small>
    Cherrypicker
  </span>
);

export default BrandName;
