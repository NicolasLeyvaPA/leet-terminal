export const Tag = ({ type, children, small }) => (
  <span className={`tag tag-${type} ${small ? 'tag-small' : ''}`}>{children}</span>
);
