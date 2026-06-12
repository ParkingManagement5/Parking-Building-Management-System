export default function DriverProfilePage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My Profile</h1>
          <p>View and update your personal information</p>
        </div>

        <button className="primary-btn">Update Profile</button>
      </div>

      <div className="profile-card">
        <div className="profile-avatar">D</div>

        <div className="profile-info">
          <div>
            <label>Username</label>
            <p>driver01</p>
          </div>

          <div>
            <label>Full Name</label>
            <p>Nguyen Van A</p>
          </div>

          <div>
            <label>Email</label>
            <p>driver@gmail.com</p>
          </div>

          <div>
            <label>Phone</label>
            <p>0900000004</p>
          </div>

          <div>
            <label>Role</label>
            <p>DRIVER</p>
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