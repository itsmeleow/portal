import { NextPage } from 'next';
import { Box, Button, Card, IconExclamation, Input, Text } from 'degen';
import Layout from 'components/Layout/Layout';
import ClubCard from 'components/ClubCard/ClubCard';

const Club: NextPage = () => {
  return (
    <Layout>
      <Box>
        <h1 className="text-2xl text-white">Club</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          <ClubCard/>
        </div>
      </Box>
    </Layout>
  );
};

export default Club;
