import java.util.*;
public class rubik {
    static class Cube{
        int[][] cubeState;
        Cube parent;
        int moveApplied;
        int moves;

        Cube(int[][] c,Cube p,int move,int m){
            cubeState = c;
            parent = p;
            moveApplied = move;
            moves = m;
        }
    }
    //    public static int[][] cube = new int[6][9];
    public static int[][] initializeSolvedCube(){
        int[][] cube = new int[6][9];
        // Faces = White , Red , Green , Orange , Blue , Yellow ;
//        int[] colors = {"W","R","G","O","B","Y"};
        for(int i=0;i<6;i++){
            for(int j=0;j<9;j++){
                cube[i][j] = i+1;
            }
        }
        return cube;
    }
    public static void printCube(int[][] cube){
        String[] colors = {"W","R","G","O","B","Y"};
        for(int i=0;i<6;i++){
            for(int j=0;j<9;j++){
                System.out.print(colors[cube[i][j]-1] + " ");
            }
            System.out.println();
        }
    }

    public static void rotateFaceClockWise(int[][] cube,int face) {
        int[] temp = new int[9];
        System.arraycopy(cube[face], 0, temp, 0, 9);
        cube[face][0] = temp[6];
        cube[face][1] = temp[3];
        cube[face][2] = temp[0];
        cube[face][3] = temp[7];
        cube[face][4] = temp[4];
        cube[face][5] = temp[1];
        cube[face][6] = temp[8];
        cube[face][7] = temp[5];
        cube[face][8] = temp[2];
    }
    public static void rotateFaceAntiClockWise(int[][] cube,int face) {
        int[] temp = new int[9];
        System.arraycopy(cube[face], 0, temp, 0, 9);
        cube[face][0] = temp[2];
        cube[face][1] = temp[5];
        cube[face][2] = temp[8];
        cube[face][3] = temp[1];
        cube[face][4] = temp[4];
        cube[face][5] = temp[7];
        cube[face][6] = temp[0];
        cube[face][7] = temp[3];
        cube[face][8] = temp[6];
    }
    public static int[][] U(int[][] cube){
        rotateFaceClockWise(cube,0);

        int[] temp = new int[3];
        System.arraycopy(cube[1], 0, temp, 0, 3);
        for(int i=1;i<4;i++){
            System.arraycopy(cube[i + 1], 0, cube[i], 0, 3);
        }
        System.arraycopy(temp, 0, cube[4], 0, 3);
        return cube;
    }
    public static int[][] UPrime(int[][] cube){
        rotateFaceAntiClockWise(cube,0);

        int[] temp = new int[3];
        System.arraycopy(cube[4], 0, temp, 0, 3);
        for(int i=4;i>1;i--){
            System.arraycopy(cube[i - 1], 0, cube[i], 0, 3);
        }
        System.arraycopy(temp, 0, cube[1], 0, 3);
        return cube;
    }

    public static int[][] D(int[][] cube){
        rotateFaceClockWise(cube,5);

        int[] temp = new int[3];
        for(int j=6;j<9;j++){
            temp[j%3] = cube[4][j];
        }
        for(int i=4;i>1;i--){
            System.arraycopy(cube[i - 1], 6, cube[i], 6, 3);
        }
        for(int j=6;j<9;j++) {
            cube[1][j] = temp[j % 3];
        }

        return cube;
    }

    public static int[][] DPrime(int[][] cube){
        rotateFaceAntiClockWise(cube,5);

        int[] temp = new int[3];
        for(int j=6;j<9;j++){
            temp[j%3] = cube[1][j];
        }
        for(int i=1;i<4;i++){
            System.arraycopy(cube[i + 1], 6, cube[i], 6, 3);
        }
        for(int j=6;j<9;j++){
            cube[4][j] = temp[j%3];
        }

        return cube;
    }

    public static int[][] F(int[][] cube) {
        rotateFaceClockWise(cube,1);

        int[] temp = new int[3];
        for(int j=6;j<9;j++){
            temp[j%3] = cube[0][j];
        }
        cube[0][6] = cube[4][8];
        cube[0][7] = cube[4][5];
        cube[0][8] = cube[4][2];

        cube[4][2] = cube[5][0];
        cube[4][5] = cube[5][1];
        cube[4][8] = cube[5][2];

        cube[5][0] = cube[2][6];
        cube[5][1] = cube[2][3];
        cube[5][2] = cube[2][0];

        cube[2][0] = temp[0];
        cube[2][3] = temp[1];
        cube[2][6] = temp[2];

        return cube;

    }

    public static int[][] FPrime(int[][] cube){
        rotateFaceAntiClockWise(cube,1);

        int[] temp = new int[3];
        for(int j=6;j<9;j++){
            temp[j%3] = cube[0][j];
        }
        cube[0][6] = cube[2][0];
        cube[0][7] = cube[2][3];
        cube[0][8] = cube[2][6];

        cube[2][0] = cube[5][2];
        cube[2][3] = cube[5][1];
        cube[2][6] = cube[5][0];

        cube[5][0] = cube[4][2];
        cube[5][1] = cube[4][5];
        cube[5][2] = cube[4][8];

        cube[4][2] = temp[2];
        cube[4][5] = temp[1];
        cube[4][8] = temp[0];

        return cube;

    }

    public static int[][] B(int[][] cube){
        rotateFaceClockWise(cube,3);

        int[] temp = new int[3];
        for(int j=0;j<3;j++){
            temp[j%3] = cube[0][j];
        }

        cube[0][0] = cube[2][2];
        cube[0][1] = cube[2][5];
        cube[0][2] = cube[2][8];

        cube[2][2] = cube[5][8];
        cube[2][5] = cube[5][7];
        cube[2][8] = cube[5][6];

        cube[5][6] = cube[4][0];
        cube[5][7] = cube[4][3];
        cube[5][8] = cube[4][6];

        cube[4][0] = temp[2];
        cube[4][3] = temp[1];
        cube[4][6] = temp[0];

        return cube;

    }

    public static int[][] BPrime(int[][] cube) {
        rotateFaceAntiClockWise(cube,3);

        int[] temp = new int[3];
        for (int j = 0; j < 3; j++) {
            temp[j % 3] = cube[0][j];
        }

        cube[0][0] = cube[4][6];
        cube[0][1] = cube[4][3];
        cube[0][2] = cube[4][0];

        cube[4][0] = cube[5][6];
        cube[4][3] = cube[5][7];
        cube[4][6] = cube[5][8];

        cube[5][6] = cube[2][8];
        cube[5][7] = cube[2][5];
        cube[5][8] = cube[2][2];

        cube[2][2] = temp[0];
        cube[2][5] = temp[1];
        cube[2][8] = temp[2];

        return cube;
    }
    public static int[][] R(int[][] cube) {
        rotateFaceClockWise(cube,2);

        int[] temp = new int[3];
        temp[0] = cube[0][2];
        temp[1] = cube[0][5];
        temp[2] = cube[0][8];

        cube[0][2] = cube[1][2];
        cube[0][5] = cube[1][5];
        cube[0][8] = cube[1][8];

        cube[1][2] = cube[5][2];
        cube[1][5] = cube[5][5];
        cube[1][8] = cube[5][8];

        cube[5][2] = cube[3][6];
        cube[5][5] = cube[3][3];
        cube[5][8] = cube[3][0];

        cube[3][0] = temp[2];
        cube[3][3] = temp[1];
        cube[3][6] = temp[0];

        return cube;
    }
    public static int[][] RPrime(int[][] cube) {
        rotateFaceAntiClockWise(cube,2);

        int[] temp = new int[3];
        temp[0] = cube[0][2];
        temp[1] = cube[0][5];
        temp[2] = cube[0][8];

        cube[0][2] = cube[3][6];
        cube[0][5] = cube[3][3];
        cube[0][8] = cube[3][0];

        cube[3][0] = cube[5][8];
        cube[3][3] = cube[5][5];
        cube[3][6] = cube[5][2];

        cube[5][2] = cube[1][2];
        cube[5][5] = cube[1][5];
        cube[5][8] = cube[1][8];

        cube[1][2] = temp[0];
        cube[1][5] = temp[1];
        cube[1][8] = temp[2];

        return cube;
    }
    public static int[][] L(int[][] cube) {
        rotateFaceClockWise(cube,4);

        int[] temp = new int[3];
        temp[0] = cube[0][0];
        temp[1] = cube[0][3];
        temp[2] = cube[0][6];

        cube[0][0] = cube[3][8];
        cube[0][3] = cube[3][5];
        cube[0][6] = cube[3][2];

        cube[3][2] = cube[5][6];
        cube[3][5] = cube[5][3];
        cube[3][8] = cube[5][0];

        cube[5][0] = cube[1][0];
        cube[5][3] = cube[1][3];
        cube[5][6] = cube[1][6];

        cube[1][0] = temp[0];
        cube[1][3] = temp[1];
        cube[1][6] = temp[2];

        return cube;
    }
    public static int[][] LPrime(int[][] cube) {
        rotateFaceAntiClockWise(cube,4);

        int[] temp = new int[3];
        temp[0] = cube[0][0];
        temp[1] = cube[0][3];
        temp[2] = cube[0][6];

        cube[0][0] = cube[1][0];
        cube[0][3] = cube[1][3];
        cube[0][6] = cube[1][6];

        cube[1][0] = cube[5][0];
        cube[1][3] = cube[5][3];
        cube[1][6] = cube[5][6];

        cube[5][0] = cube[3][8];
        cube[5][3] = cube[3][5];
        cube[5][6] = cube[3][2];

        cube[3][2] = temp[2];
        cube[3][5] = temp[1];
        cube[3][8] = temp[0];

        return cube;
    }

    public static int[][] performMove(int[][] cube,int n){
        return switch (n) {
            case 1 -> U(cube);
            case 2 -> UPrime(cube);
            case 3 -> D(cube);
            case 4 -> DPrime(cube);
            case 5 -> F(cube);
            case 6 -> FPrime(cube);
            case 7 -> B(cube);
            case 8 -> BPrime(cube);
            case 9 -> R(cube);
            case 10 -> RPrime(cube);
            case 11 -> L(cube);
            case 12 -> LPrime(cube);
            default -> new int[0][];
        };
    }
    public static String convertCubeToString(int[][] cube) {
        StringBuilder sb = new StringBuilder();
        for (int[] face : cube) {
            for (int sticker : face) {
                sb.append(sticker);
            }
        }
        return sb.toString();
    }
    public static int[][] deepCopyCube(int[][] cube) {
        int[][] copy = new int[cube.length][];
        for (int i = 0; i < cube.length; i++) {
            copy[i] = Arrays.copyOf(cube[i], cube[i].length);
        }
        return copy;
    }
    public static void findPath(Cube c){
        ArrayList<Integer> path = new ArrayList<>();

        while(c.parent != null){
            path.add(0,c.moveApplied);
            c = c.parent;
        }

        System.out.println(path);

    }

    public static void solveCube(int[][] cube){
        int[][] solvedState = initializeSolvedCube();

        HashSet<String> vis = new HashSet<>();
        Queue<Cube> q = new LinkedList<>();
        q.add(new Cube(deepCopyCube(cube),null,0, 0));

        while(!q.isEmpty()){
            Cube front = q.poll();

            if (Arrays.deepEquals(front.cubeState, solvedState)) {
                System.out.println("Cube Solved with total moves = " + front.moves);
                findPath(front);
                return;
            }

            String cubeString = convertCubeToString(front.cubeState);
            if (!vis.contains(cubeString)) {
                vis.add(cubeString);
                for (int i = 1; i <= 12; i++) {
                    int[][] newState = deepCopyCube(front.cubeState);
                    newState = performMove(newState, i);
                    q.add(new Cube(newState, front,i,front.moves + 1));
                }
            }
        }

    }

    public static int[][] testing(int[][] cube,String s){
        String[] str = s.split(" ");
        for(String i:str){
            int n = Integer.parseInt(i);
            switch (n) {
                case 1 -> cube = U(cube);
                case 2 -> cube = UPrime(cube);
                case 3 -> cube = D(cube);
                case 4 -> cube = DPrime(cube);
                case 5 -> cube = F(cube);
                case 6 -> cube = FPrime(cube);
                case 7 -> cube = B(cube);
                case 8 -> cube = BPrime(cube);
                case 9 -> cube = R(cube);
                case 10 -> cube = RPrime(cube);
                case 11 -> cube = L(cube);
                case 12 -> cube = LPrime(cube);
                default -> System.out.println("Invalid Number");
            }
        }
        return cube;
    }

    public static void main(String[] args) {
        int[][] cube = {
                {1, 1, 1, 1, 1, 1, 1, 1, 1},  // White face (1)
                {2, 2, 2, 2, 2, 2, 2, 2, 2},  // Red face (2)
                {3, 3, 3, 3, 3, 3, 3, 3, 3},  // Green face (3)
                {4, 4, 4, 4, 4, 4, 4, 4, 4},  // Orange face (4)
                {5, 5, 5, 5, 5, 5, 5, 5, 5},  // Blue face (5)
                {6, 6, 6, 6, 6, 6, 6, 6, 6}   // Yellow face (6)
        };


//        printCube(testing(cube,"24"));
        solveCube(testing(cube,"6 6 10 12 12 7"));


//        printCube(cube);
    }
}