import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
} from "@clerk/clerk-react";

const Home = () => {
  const { getToken } = useAuth();
  const token = async () => await getToken();

  const user = fetch("http://localhost:8080/api/v1/example/protected", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  })
    .then((res) => res.json())
    .catch((err) => {
      console.error("Error fetching protected data:", err);
      return null;
    });
  console.log("Fetched user data:", user);

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
