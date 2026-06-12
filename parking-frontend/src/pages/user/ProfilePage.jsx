export default function ProfilePage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My Profile</h1>
          <p>View and update personal information</p>
        </div>
        <button className="primary-btn">Update Profile</button>
      </div>

      <div className="profile-card">
        <div className="profile-avatar">A</div>

        <div className="profile-info">
          <div>
            <label>Username</label>
            <p>admin</p>
          </div>

          <div>
            <label>Full Name</label>
            <p>System Admin</p>
          </div>

          <div>
            <label>Email</label>
            <p>admin@gmail.com</p>
          </div>

          <div>
            <label>Phone</label>
            <p>0900000001</p>
          </div>

          <div>
            <label>Role</label>
            <p>ADMIN</p>
          </div>

          <div>
            <label>Status</label>
            <p>Active</p>
          </div>
        </div>
      </div>
    </div>
  );
}