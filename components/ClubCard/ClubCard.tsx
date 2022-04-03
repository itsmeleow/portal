import { Avatar, Box, Stack, Text, Tag } from "degen";

const cardContainer = 'box-border border-2 border-transparent hover:border-';

const ClubCard = (props: any) => {
    const Data = props;
    return (
        <Box
        backgroundColor="backgroundTertiary"
        padding="5"
        borderRadius="2xLarge"
        width="full"
        className={cardContainer}
        >
        <Stack>
            <Box paddingBottom="3">
            <Stack justify="space-between" align="center" direction="horizontal">
                <Stack
                direction="horizontal"
                align="center"
                justify="space-between"
                space="2"
                >
                {/* <Avatar
                    label="TetranodeNFT"
                    size="10"
                    src={newClubData.data.imageUrl}
                /> */}
                <Box>
                    <Text
                    weight="semiBold"
                    variant="large"
                    ellipsis
                    lineHeight="none"
                    whiteSpace="pre-wrap"
                    >
                    {' '}
                    {Data.name}
                    </Text>
                </Box>
                </Stack>
                <Tag tone="accent">V3</Tag>
            </Stack>
            </Box>
            <Stack>
            <Stack direction="horizontal" align="center" justify="space-between">
                <Text
                size="small"
                align="left"
                weight="normal"
                color="textTertiary"
                >
                {Data.description}
                </Text>
            </Stack>
            </Stack>
        </Stack>
        </Box>
    );
}

export default ClubCard;