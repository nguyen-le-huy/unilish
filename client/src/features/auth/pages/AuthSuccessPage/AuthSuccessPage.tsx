import { useGoogleCallback } from '../../hooks/useGoogleCallback';
import { Loading } from '@/components/common/Loading/Loading';

const AuthSuccessPage = () => {
    // Use TanStack Query hook instead of manual useEffect
    useGoogleCallback();

    return (
        <div className="flex items-center justify-center min-h-screen">
            <Loading />
            <p className="ml-4 text-gray-500">Completing login...</p>
        </div>
    );
};

export default AuthSuccessPage;
