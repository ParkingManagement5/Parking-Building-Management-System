export default function PaymentHistoryPage() {
  const payments = [
    {
      paymentId: 1,
      bookingCode: "BK1001",
      licensePlate: "51A-12345",
      amount: 60000,
      method: "VNPay",
      status: "Paid",
      paidAt: "2026-06-06 12:10",
    },
  ];

  const formatCurrency = (value) => Number(value).toLocaleString("vi-VN") + "đ";

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Payment History</h1>
          <p>View your parking payment history</p>
        </div>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Booking Code</th>
              <th>License Plate</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
              <th>Paid At</th>
            </tr>
          </thead>

          <tbody>
            {payments.map((item) => (
              <tr key={item.paymentId}>
                <td>{item.paymentId}</td>
                <td>{item.bookingCode}</td>
                <td>{item.licensePlate}</td>
                <td>{formatCurrency(item.amount)}</td>
                <td>{item.method}</td>
                <td><span className="badge success">{item.status}</span></td>
                <td>{item.paidAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}