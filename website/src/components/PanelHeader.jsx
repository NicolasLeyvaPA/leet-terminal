export const PanelHeader = ({ title, subtitle, actions }) => (
  <div className="panel-header flex items-center justify-between">
    <div className="flex items-center gap-2">
      <span>{title}</span>
      {subtitle && (
        <span className="text-gray-600 font-normal text-xs">| {subtitle}</span>
      )}
    </div>
    {actions}
  </div>
);

