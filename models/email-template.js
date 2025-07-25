exports.resetPasswordEmail = (name, resetLink) => {
    return `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Hello ${name},</h2>
      <p>You requested to reset your admin password. Click the link below to continue:</p>
      <p>
        <a href="${resetLink}" style="color: #007bff;">Reset Password</a>
      </p>
      <p>This link is valid for 15 minutes only.</p>
      <hr/>
      <small>If you didn’t request this, you can safely ignore this email.</small>
    </div>
  `;
};
