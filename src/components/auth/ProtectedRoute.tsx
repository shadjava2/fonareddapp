interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // Mode développement : affichage direct sans vérification
  return <>{children}</>;
};

export default ProtectedRoute;
