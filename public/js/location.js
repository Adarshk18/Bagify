function detectLocation() {
  if (!navigator.geolocation) return alert("Geolocation not supported!");

  navigator.geolocation.getCurrentPosition(async (position) => {
    const { latitude, longitude } = position.coords;
    document.getElementById("lat").value = latitude;
    document.getElementById("lng").value = longitude;

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
      const data = await res.json();
      const addr = data.address;

      document.querySelector("input[name='street']").value = `${addr.road || ""} ${addr.suburb || ""}`;
      document.querySelector("input[name='city']").value = addr.city || addr.town || addr.village || "";
      document.querySelector("input[name='state']").value = addr.state || "";
      document.querySelector("input[name='pincode']").value = addr.postcode || "";
      document.querySelector("input[name='country']").value = addr.country || "";

    } catch (err) {
      console.error("Reverse geocoding failed", err);
    }
  });
}
