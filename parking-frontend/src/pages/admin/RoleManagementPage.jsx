export default function RoleManagementPage() {
  const roles = [
    { roleId: 1, roleName: "DRIVER", description: "Parking user / driver" },
    { roleId: 2, roleName: "STAFF", description: "Parking staff" },
    { roleId: 3, roleName: "MANAGER", description: "Parking manager" },
    { roleId: 4, roleName: "ADMIN", description: "System administrator" },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Role Management</h1>
          <p>View system roles and permissions</p>
        </div>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Role Name</th>
              <th>Description</th>
            </tr>
          </thead>

          <tbody>
            {roles.map((item) => (
              <tr key={item.roleId}>
                <td>{item.roleId}</td>
                <td>
                  <span className="badge info">{item.roleName}</span>
                </td>
                <td>{item.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}