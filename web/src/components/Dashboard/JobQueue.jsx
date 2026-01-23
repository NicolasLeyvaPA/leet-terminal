/**
 * JobQueue component
 * Displays current scraping and analysis jobs in queue
 */
const JobQueue = ({ jobs, onCancel, onRetry }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'running': return 'status-running';
      case 'completed': return 'status-completed';
      case 'failed': return 'status-failed';
      default: return '';
    }
  };

  return (
    <div className="job-queue">
      <h3>Job Queue</h3>
      <div className="queue-container">
        {jobs && jobs.length > 0 ? (
          <ul className="job-list">
            {jobs.map((job) => (
              <li key={job.id} className="job-item">
                <div className="job-info">
                  <span className={`job-status ${getStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                  <span className="job-type">{job.type}</span>
                  <span className="job-url">{job.url || job.target}</span>
                </div>
                <div className="job-actions">
                  {job.status === 'failed' && (
                    <button onClick={() => onRetry(job.id)} className="btn-retry">
                      Retry
                    </button>
                  )}
                  {(job.status === 'pending' || job.status === 'running') && (
                    <button onClick={() => onCancel(job.id)} className="btn-cancel">
                      Cancel
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-queue">No jobs in queue</p>
        )}
      </div>
    </div>
  );
};

export default JobQueue;
