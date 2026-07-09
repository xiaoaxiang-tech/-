import axios from "axios";
export async function getIfreamAPL(url: string) {
  let res = await axios.get("http://localhost:3000/demo-height", {
    params: {
      url: url,
    },
  });

  return res.data.height;
}
