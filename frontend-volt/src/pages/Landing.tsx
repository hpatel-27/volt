import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
} from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import useFetch from "../hooks/useFetch";

const Home = () => {
  const authenticatedFetch = useFetch();
  const [weights, setWeights] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function fetchWeights() {
      const response = await authenticatedFetch(
        "http://localhost:8080/api/v1/weights?page=1&limit=10",
      );
      console.log("Fetched weights:", response);
      setWeights(response.weights);
      setPage(response.page);
      setLimit(response.limit);
      setTotal(response.total);
    }

    fetchWeights();
  }, [authenticatedFetch]);

  console.log("Weights state:", weights);
  console.log("Page state:", page);
  console.log("Limit state:", limit);
  console.log("Total state:", total);

  const { getToken } = useAuth();
  async function fetchToken() {
    const token = await getToken();
    console.log(token);
  }

  fetchToken();
  console.log(new Date().toISOString());
  return (
    <>
      <header>
        <SignedOut>
          <SignInButton />
          <SignUpButton />
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </header>
    </>
  );
};

export default Home;
